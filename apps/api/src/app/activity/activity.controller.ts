import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ChannelTypeEnum, IJwtPayload } from '@notifire/shared';
import { GetActivityFeed } from './usecases/get-activity-feed/get-activity-feed.usecase';
import { GetActivityFeedCommand } from './usecases/get-activity-feed/get-activity-feed.command';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { GetActivityStats } from './usecases/get-activity-stats/get-activity-stats.usecase';
import { GetActivityStatsCommand } from './usecases/get-activity-stats/get-activity-stats.command';

@Controller('/activity')
export class ActivityController {
  constructor(private getActivityFeedUsecase: GetActivityFeed, private getActivityStatsUsecase: GetActivityStats) {}

  @Get('')
  @UseGuards(JwtAuthGuard)
  getActivityFeed(
    @UserSession() user: IJwtPayload,
    @Query('channels') channels: ChannelTypeEnum[] | ChannelTypeEnum,
    @Query('templates') templates: string[] | string,
    @Query('search') search: string,
    @Query('page') page = 0
  ) {
    let channelsQuery: ChannelTypeEnum[];

    if (channels) {
      channelsQuery = Array.isArray(channels) ? channels : [channels];
    }

    let templatesQuery: string[];
    if (templates) {
      templatesQuery = Array.isArray(templates) ? templates : [templates];
    }

    return this.getActivityFeedUsecase.execute(
      GetActivityFeedCommand.create({
        page: page ? Number(page) : 0,
        organizationId: user.organizationId,
        applicationId: user.applicationId,
        userId: user._id,
        channels: channelsQuery,
        templates: templatesQuery,
        search,
      })
    );
  }

  @Get('/stats')
  @UseGuards(JwtAuthGuard)
  getActivityStats(@UserSession() user: IJwtPayload, @Query('page') page = 0) {
    return this.getActivityStatsUsecase.execute(
      GetActivityStatsCommand.create({
        organizationId: user.organizationId,
        applicationId: user.applicationId,
        userId: user._id,
      })
    );
  }
}
