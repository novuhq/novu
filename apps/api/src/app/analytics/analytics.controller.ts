import { Body, Controller, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService, ExternalApiAccessible, UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@Controller({
  path: 'telemetry',
})
@SkipThrottle()
@ApiExcludeController()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

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
}
