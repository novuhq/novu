import { Body, Controller, Post, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService, ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller({
  path: 'telemetry',
})
@SkipThrottle()
@ApiExcludeController()
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private httpService: HttpService
  ) {}

  @Post('/measure')
  @ExternalApiAccessible()
  @UserAuthentication()
  async trackEvent(@Body('event') event, @Body('data') data = {}, @UserSession() user: UserSessionData): Promise<any> {
    this.analyticsService.track(event, user._id, {
      ...(data || {}),
      _organization: user?.organizationId,
    });

    return {
      success: true,
    };
  }

  @Post('/identify')
  @ExternalApiAccessible()
  @UserAuthentication()
  async identifyUser(@Body() userData: any, @UserSession() user: UserSessionData): Promise<any> {
    try {
      const hubspotPortalId = '44416662';
      const hubspotFormId = 'fc39aa98-4285-4322-9514-52da978baae8';
      const hubspotSubmitUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormId}`;

      const hubspotData = {
        fields: [
          { name: 'email', value: user.email },
          { name: 'lastname', value: user.lastName || 'Unknown' },
          { name: 'firstname', value: user.firstName || 'Unknown' },
        ],
        context: {
          hutk: userData.hubspotContext,
          pageUri: userData.pageUri,
          pageName: userData.pageName,
        },
      };

      const response = await firstValueFrom(this.httpService.post(hubspotSubmitUrl, hubspotData));

      return {
        success: true,
        hubspotResponse: response.data,
      };
    } catch (error) {
      console.error('Error submitting to HubSpot:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
