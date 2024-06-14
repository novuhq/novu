import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UserSessionData } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateFeed } from './usecases/create-feed/create-feed.usecase';
import { CreateFeedCommand } from './usecases/create-feed/create-feed.command';
import { CreateFeedRequestDto } from './dto/create-feed-request.dto';
import { GetFeeds } from './usecases/get-feeds/get-feeds.usecase';
import { GetFeedsCommand } from './usecases/get-feeds/get-feeds.command';
import { DeleteFeed } from './usecases/delete-feed/delete-feed.usecase';
import { DeleteFeedCommand } from './usecases/delete-feed/delete-feed.command';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FeedResponseDto } from './dto/feed-response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';

@ApiCommonResponses()
@Controller('/feeds')
@UseInterceptors(ClassSerializerInterceptor)
@UserAuthentication()
@ApiTags('Feeds')
export class FeedsController {
  constructor(
    private createFeedUsecase: CreateFeed,
    private getFeedsUsecase: GetFeeds,
    private deleteFeedsUsecase: DeleteFeed
  ) {}

  @Post('')
  @ApiResponse(FeedResponseDto, 201)
  @ApiOperation({
    summary: 'Create feed',
  })
  @ExternalApiAccessible()
  createFeed(@UserSession() user: UserSessionData, @Body() body: CreateFeedRequestDto): Promise<FeedResponseDto> {
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
  @ApiResponse(FeedResponseDto, 200, true)
  @ApiOperation({
    summary: 'Get feeds',
  })
  @ExternalApiAccessible()
  getFeeds(@UserSession() user: UserSessionData): Promise<FeedResponseDto[]> {
    return this.getFeedsUsecase.execute(
      GetFeedsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }

  @Delete('/:feedId')
  @ApiResponse(FeedResponseDto, 200, true)
  @ApiOperation({
    summary: 'Delete feed',
  })
  @ExternalApiAccessible()
  deleteFeedById(@UserSession() user: UserSessionData, @Param('feedId') feedId: string): Promise<FeedResponseDto[]> {
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
