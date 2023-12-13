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
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
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

@ApiCommonResponses()
@Controller('/feeds')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
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
  createFeed(@UserSession() user: IJwtPayload, @Body() body: CreateFeedRequestDto): Promise<FeedResponseDto> {
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
  getFeeds(@UserSession() user: IJwtPayload): Promise<FeedResponseDto[]> {
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
  deleteFeedById(@UserSession() user: IJwtPayload, @Param('feedId') feedId: string): Promise<FeedResponseDto[]> {
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
