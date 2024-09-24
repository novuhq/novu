import { Body, Controller, Post, Headers } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService, ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { HubspotIdentifyFormUsecase } from './usecases/hubspot-identify-form/hubspot-identify-form.usecase';
import { HubspotIdentifyFormCommand } from './usecases/hubspot-identify-form/hubspot-identify-form.command';

@Controller({
  path: 'telemetry',
})
@SkipThrottle()
@ApiExcludeController()
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private hubspotIdentifyFormUsecase: HubspotIdentifyFormUsecase
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
  async identifyUser(@Body() body: any, @UserSession() user: UserSessionData): Promise<any> {
    return this.hubspotIdentifyFormUsecase.execute(
      HubspotIdentifyFormCommand.create({
        email: user.email as string,
        lastName: user.lastName,
        firstName: user.firstName,
        hubspotContext: body.hubspotContext,
        pageUri: body.pageUri,
        pageName: body.pageName,
        organizationId: user.organizationId,
      })
    );
  }
}
