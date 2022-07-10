import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { Roles } from '../auth/framework/roles.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { CreateFeed } from './usecases/create-feed/create-feed.usecase';
import { CreateFeedCommand } from './usecases/create-feed/create-feed.command';
import { CreateFeedDto } from './dto/create-feed.dto';
import { GetFeeds } from './usecases/get-feeds/get-feeds.usecase';
import { GetFeedsCommand } from './usecases/get-feeds/get-feeds.command';
import { DeleteFeed } from './usecases/delete-feed/delete-feed.usecase';
import { DeleteFeedCommand } from './usecases/delete-feed/delete-feed.command';

@Controller('/feeds')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class FeedsController {
  constructor(
    private createFeedUsecase: CreateFeed,
    private getFeedsUsecase: GetFeeds,
    private deleteFeedsUsecase: DeleteFeed
  ) {}

  @Post('')
  @Roles(MemberRoleEnum.ADMIN)
  createFeed(@UserSession() user: IJwtPayload, @Body() body: CreateFeedDto) {
    return this.createFeedUsecase.execute(
      CreateFeedCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
      })
    );
  }

  @Get('')
  @Roles(MemberRoleEnum.ADMIN)
  getFeeds(@UserSession() user: IJwtPayload) {
    return this.getFeedsUsecase.execute(
      GetFeedsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }

  @Delete('/:feedId')
  @Roles(MemberRoleEnum.ADMIN)
  deleteFeedById(@UserSession() user: IJwtPayload, @Param('feedId') feedId: string) {
    return this.deleteFeedsUsecase.execute(
      DeleteFeedCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        feedId,
      })
    );
  }
}
