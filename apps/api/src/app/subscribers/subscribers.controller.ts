import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CreateSubscriber, CreateSubscriberCommand } from './usecases/create-subscriber';
import { UpdateSubscriber, UpdateSubscriberCommand } from './usecases/update-subscriber';
import { RemoveSubscriber, RemoveSubscriberCommand } from './usecases/remove-subscriber';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { ButtonTypeEnum, IJwtPayload, MessageActionStatusEnum } from '@novu/shared';
import {
  CreateSubscriberRequestDto,
  DeleteSubscriberResponseDto,
  SubscriberResponseDto,
  SubscribersResponseDto,
  UpdateSubscriberChannelRequestDto,
  UpdateSubscriberRequestDto,
} from './dtos';
import { UpdateSubscriberChannel, UpdateSubscriberChannelCommand } from './usecases/update-subscriber-channel';
import { GetSubscribers } from './usecases/get-subscribers';
import { GetSubscribersCommand } from './usecases/get-subscribers';
import { GetSubscriber } from './usecases/get-subscriber/get-subscriber.usecase';
import { GetSubscriberCommand } from './usecases/get-subscriber';
import { ApiTags, ApiOkResponse, ApiOperation, ApiCreatedResponse } from '@nestjs/swagger';
import { GetPreferencesCommand } from './usecases/get-preferences/get-preferences.command';
import { GetPreferences } from './usecases/get-preferences/get-preferences.usecase';
import { UpdatePreference } from './usecases/update-preference/update-preference.usecase';
import { UpdateSubscriberPreferenceCommand } from './usecases/update-subscriber-preference';
import { UpdateSubscriberPreferenceResponseDto } from '../widgets/dtos/update-subscriber-preference-response.dto';
import { UpdateSubscriberPreferenceRequestDto } from '../widgets/dtos/update-subscriber-preference-request.dto';
import { MessageResponseDto } from '../widgets/dtos/message-response.dto';
import { UnseenCountResponse } from '../widgets/dtos/unseen-count-response.dto';
import { GetUnseenCountCommand } from '../widgets/usecases/get-unseen-count/get-unseen-count.command';
import { OrganizationResponseDto } from '../widgets/dtos/organization-response.dto';
import { MessageEntity } from '@novu/dal';
import { MarkMessageAsSeenCommand } from '../widgets/usecases/mark-message-as-seen/mark-message-as-seen.command';
import { UpdateMessageActionsCommand } from '../widgets/usecases/mark-action-as-done/update-message-actions.command';
import { GetOrganizationDataCommand } from '../widgets/usecases/get-organization-data/get-organization-data.command';
import { GetNotificationsFeedCommand } from '../widgets/usecases/get-notifications-feed/get-notifications-feed.command';
import { GetNotificationsFeed } from '../widgets/usecases/get-notifications-feed/get-notifications-feed.usecase';
import { GetUnseenCount } from '../widgets/usecases/get-unseen-count/get-unseen-count.usecase';
import { MarkMessageAsSeen } from '../widgets/usecases/mark-message-as-seen/mark-message-as-seen.usecase';
import { UpdateMessageActions } from '../widgets/usecases/mark-action-as-done/update-message-actions.usecause';
import { GetOrganizationData } from '../widgets/usecases/get-organization-data/get-organization-data.usecase';
import { LogUsageRequestDto } from '../widgets/dtos/log-usage-request.dto';
import { LogUsageResponseDto } from '../widgets/dtos/log-usage-response.dto';
import { AnalyticsService } from '../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../shared/shared.module';

@Controller('/subscribers')
@ApiTags('Subscribers')
export class SubscribersController {
  constructor(
    private createSubscriberUsecase: CreateSubscriber,
    private updateSubscriberUsecase: UpdateSubscriber,
    private updateSubscriberChannelUsecase: UpdateSubscriberChannel,
    private removeSubscriberUsecase: RemoveSubscriber,
    private getSubscriberUseCase: GetSubscriber,
    private getSubscribersUsecase: GetSubscribers,
    private getPreferenceUsecase: GetPreferences,
    private updatePreferenceUsecase: UpdatePreference,
    private getNotificationsFeedUsecase: GetNotificationsFeed,
    private genUnseenCountUsecase: GetUnseenCount,
    private markMessageAsSeenUsecase: MarkMessageAsSeen,
    private updateMessageActionsUsecase: UpdateMessageActions,
    private getOrganizationUsecase: GetOrganizationData,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: SubscribersResponseDto,
  })
  @ApiOperation({
    summary: 'Get subscribers',
    description: 'Get subscribers paginated',
  })
  async getSubscribers(@UserSession() user: IJwtPayload, @Query('page') page = 0): Promise<SubscribersResponseDto> {
    return await this.getSubscribersUsecase.execute(
      GetSubscribersCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: page ? Number(page) : 0,
      })
    );
  }

  @Get('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: SubscriberResponseDto,
  })
  @ApiOperation({
    summary: 'Get subscriber',
    description: 'Get subscriber by your internal id for subscriber',
  })
  async getSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<SubscriberResponseDto> {
    return await this.getSubscriberUseCase.execute(
      GetSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    type: SubscriberResponseDto,
  })
  @ApiOperation({
    summary: 'Create subscriber',
    description: 'Create subscriber with your internal id for subscriber',
  })
  async createSubscriber(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId: body.subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
      })
    );
  }

  @Put('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: SubscriberResponseDto,
  })
  @ApiOperation({
    summary: 'Update subscriber',
    description: 'Update subscriber with your internal id for subscriber',
  })
  async updateSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberUsecase.execute(
      UpdateSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        avatar: body.avatar,
      })
    );
  }

  @Put('/:subscriberId/credentials')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: SubscriberResponseDto,
  })
  @ApiOperation({
    summary: 'Update subscriber channel details',
    description: 'Update subscribers channel details with your internal id for subscriber',
  })
  async updateSubscriberChannel(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Body() body: UpdateSubscriberChannelRequestDto
  ): Promise<SubscriberResponseDto> {
    return await this.updateSubscriberChannelUsecase.execute(
      UpdateSubscriberChannelCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
        providerId: body.providerId,
        credentials: body.credentials,
      })
    );
  }

  @Delete('/:subscriberId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: DeleteSubscriberResponseDto,
  })
  @ApiOperation({
    summary: 'Delete subscriber',
    description: 'Delete subscriber with your internal id for subscriber',
  })
  async removeSubscriber(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<DeleteSubscriberResponseDto> {
    return await this.removeSubscriberUsecase.execute(
      RemoveSubscriberCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        subscriberId,
      })
    );
  }

  @Get('/:subscriberId/preferences')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: [UpdateSubscriberPreferenceResponseDto],
  })
  @ApiOperation({
    summary: 'Get subscriber preferences',
  })
  async getSubscriberPreference(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<UpdateSubscriberPreferenceResponseDto[]> {
    const command = GetPreferencesCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
    });

    return await this.getPreferenceUsecase.execute(command);
  }

  @Patch('/:subscriberId/preference/:templateId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: UpdateSubscriberPreferenceResponseDto,
  })
  @ApiOperation({
    summary: 'Update subscriber preference',
  })
  async updateSubscriberPreference(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string,
    @Param('templateId') templateId: string,
    @Body() body: UpdateSubscriberPreferenceRequestDto
  ): Promise<UpdateSubscriberPreferenceResponseDto> {
    const command = UpdateSubscriberPreferenceCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      templateId: templateId,
      channel: body.channel,
      enabled: body.enabled,
    });

    return await this.updatePreferenceUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Get('/:subscriberId/notifications/feed')
  @ApiOperation({
    summary: 'Get notifications in feed',
  })
  @ApiOkResponse({
    type: [MessageResponseDto],
  })
  async getNotificationsFeed(
    @UserSession() user: IJwtPayload,
    @Query('page') page: number,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean | undefined = undefined,
    @Param('subscriberId') subscriberId: string
  ) {
    let feedsQuery: string[];
    if (feedId) {
      feedsQuery = Array.isArray(feedId) ? feedId : [feedId];
    }

    const command = GetNotificationsFeedCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      subscriberId: subscriberId,
      page,
      feedId: feedsQuery,
      seen,
    });

    return await this.getNotificationsFeedUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Get('/:subscriberId/notifications/unseen')
  @ApiOkResponse({
    type: UnseenCountResponse,
  })
  @ApiOperation({
    summary: 'Get unseen count',
  })
  async getUnseenCount(
    @UserSession() user: IJwtPayload,
    @Query('feedIdentifier') feedId: string[] | string,
    @Query('seen') seen: boolean,
    @Param('subscriberId') subscriberId: string
  ): Promise<UnseenCountResponse> {
    let feedsQuery: string[];
    if (feedId) {
      feedsQuery = Array.isArray(feedId) ? feedId : [feedId];
    }

    const command = GetUnseenCountCommand.create({
      organizationId: user.organizationId,
      subscriberId: subscriberId,
      environmentId: user.environmentId,
      feedId: feedsQuery,
      seen,
    });

    return await this.genUnseenCountUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/:subscriberId/messages/:messageId/seen')
  @ApiOperation({
    summary: 'Mark message as seen',
  })
  @ApiCreatedResponse({
    type: MessageResponseDto,
  })
  async markMessageAsSeen(
    @UserSession() user: IJwtPayload,
    @Param('messageId') messageId: string,
    @Param('subscriberId') subscriberId: string
  ): Promise<MessageEntity> {
    const command = MarkMessageAsSeenCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      subscriberId: subscriberId,
      messageId,
    });

    return await this.markMessageAsSeenUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/:subscriberId/messages/:messageId/actions/:type')
  @ApiOperation({
    summary: 'Mark action as seen',
  })
  @ApiCreatedResponse({
    type: MessageResponseDto,
  })
  async markActionAsSeen(
    @UserSession() user: IJwtPayload,
    @Param('messageId') messageId: string,
    @Param('type') type: ButtonTypeEnum,
    @Body() body: { payload: any; status: MessageActionStatusEnum }, // eslint-disable-line @typescript-eslint/no-explicit-any
    @Param('subscriberId') subscriberId: string
  ): Promise<MessageEntity> {
    return await this.updateMessageActionsUsecase.execute(
      UpdateMessageActionsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        subscriberId: subscriberId,
        messageId,
        type,
        payload: body.payload,
        status: body.status,
      })
    );
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Get('/:subscriberId/organization')
  @ApiOperation({
    summary: 'Get organization',
  })
  @ApiOkResponse({
    type: OrganizationResponseDto,
  })
  async getOrganizationData(
    @UserSession() user: IJwtPayload,
    @Param('subscriberId') subscriberId: string
  ): Promise<OrganizationResponseDto> {
    const command = GetOrganizationDataCommand.create({
      organizationId: user.organizationId,
      environmentId: user.environmentId,
      subscriberId: subscriberId,
    });

    return await this.getOrganizationUsecase.execute(command);
  }

  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @Post('/usage/log')
  async logUsage(@UserSession() user: IJwtPayload, @Body() body: LogUsageRequestDto): Promise<LogUsageResponseDto> {
    this.analyticsService.track(body.name, user.organizationId, {
      environmentId: user.environmentId,
      ...(body.payload || {}),
    });

    return {
      success: true,
    };
  }
}
