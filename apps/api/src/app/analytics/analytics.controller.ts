import { Body, Controller, Post } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';

@Controller({
  path: 'analytics',
})
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Post('/telemetry')
  async trackEvent(@Body('event') event, @Body('data') data, @Body('userId') userId): Promise<any> {
    await this.analyticsService.track(event, data, userId);

    return {
      success: true,
    };
  }
}
