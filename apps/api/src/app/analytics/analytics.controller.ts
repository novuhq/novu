import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AnalyticsService, UserAuthGuard, UserSession } from '@novu/application-generic';
import { IJwtPayload } from '@novu/shared';

@Controller({
  path: 'telemetry',
})
@SkipThrottle()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('/measure')
  @UseGuards(UserAuthGuard)
  async trackEvent(@Body('event') event, @Body('data') data, @UserSession() user: IJwtPayload): Promise<any> {
    await this.analyticsService.track(event, user._id, data);

    return {
      success: true,
    };
  }
}
