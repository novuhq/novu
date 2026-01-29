import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { SubscriptionDetailsResponseDto } from '../shared/dtos/subscription-details-response.dto';
import {
  GroupPreferenceFilterDto,
  WorkflowPreferenceRequestDto,
} from '../shared/dtos/subscriptions/create-subscriptions.dto';
import { UpdateSubscriptionRequestDto } from '../shared/dtos/subscriptions/update-subscription.dto';
import { ExcludeFromIdempotency } from '../shared/framework/exclude-from-idempotency';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { SubscriberSession } from '../shared/framework/user.decorator';
import { CreateSubscriptionsCommand, CreateSubscriptionsUsecase } from '../subscriptions/usecases/create-subscriptions';
import { GetSubscriptionCommand } from '../subscriptions/usecases/get-subscription/get-subscription.command';
import { GetSubscription } from '../subscriptions/usecases/get-subscription/get-subscription.usecase';
import { UpdateSubscriptionCommand, UpdateSubscriptionUsecase } from '../subscriptions/usecases/update-subscription';
import { CreateTopicSubscriptionRequestDto } from './dtos/create-topic-subscription-request.dto';
import { ContextCompatibilityInterceptor } from './interceptors/context-compatibility.interceptor';
import { DeleteTopicSubscriptionCommand } from './usecases/delete-subscription/delete-subscription.command';
import { DeleteTopicSubscription } from './usecases/delete-subscription/delete-subscription.usecase';
import { GetTopicSubscriptionsCommand } from './usecases/get-topic-subscriptions/get-topic-subscriptions.command';
import { GetTopicSubscriptions } from './usecases/get-topic-subscriptions/get-topic-subscriptions.usecase';

@ApiCommonResponses()
@Controller('/inbox')
@ApiExcludeController()
@ExcludeFromIdempotency()
@UseInterceptors(ContextCompatibilityInterceptor)
export class InboxTopicController {
  constructor(
    private getTopicSubscriptionsUsecase: GetTopicSubscriptions,
    private getTopicSubscriptionUsecase: GetSubscription,
    private createSubscriptionsUsecase: CreateSubscriptionsUsecase,
    private updateSubscriptionUsecase: UpdateSubscriptionUsecase,
    private deleteTopicSubscriptionUsecase: DeleteTopicSubscription
  ) {}

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/topics/:topicKey/subscriptions')
  async getTopicSubscriptions(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('topicKey') topicKey: string
  ): Promise<SubscriptionDetailsResponseDto[]> {
    return await this.getTopicSubscriptionsUsecase.execute(
      GetTopicSubscriptionsCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        topicKey,
        _subscriberId: subscriberSession._id,
        contextKeys: subscriberSession.contextKeys,
      })
    );
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Get('/topics/:topicKey/subscriptions/:identifier')
  async getTopicSubscription(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('topicKey') topicKey: string,
    @Param('identifier') identifier: string,
    @Res({ passthrough: true }) res: Response,
    @Query('workflowIds') workflowIds?: string | string[],
    @Query('tags') tags?: string | string[]
  ): Promise<SubscriptionDetailsResponseDto | void> {
    const normalizedWorkflowIds = workflowIds ? (Array.isArray(workflowIds) ? workflowIds : [workflowIds]) : undefined;
    const normalizedTags = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;

    const result = await this.getTopicSubscriptionUsecase.execute(
      GetSubscriptionCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        topicKey,
        identifier,
        workflowIds: normalizedWorkflowIds,
        tags: normalizedTags,
        contextKeys: subscriberSession.contextKeys,
      })
    );

    if (!result) {
      res.status(HttpStatus.NO_CONTENT);

      return;
    }

    return result;
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Post('/topics/:topicKey/subscriptions')
  async createTopicSubscription(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('topicKey') topicKey: string,
    @Body() body: CreateTopicSubscriptionRequestDto
  ): Promise<SubscriptionDetailsResponseDto> {
    const result = await this.createSubscriptionsUsecase.execute(
      CreateSubscriptionsCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        userId: subscriberSession._id,
        topicKey,
        subscriptions: [
          {
            subscriberId: subscriberSession.subscriberId,
            identifier: body.identifier,
            name: body.name,
          },
        ],
        name: body.topic?.name,
        preferences: body.preferences ? this.convertPreferencesToGroupFilters(body.preferences) : undefined,
        contextKeys: subscriberSession.contextKeys,
      })
    );

    if (result.errors && result.errors.length > 0) {
      throw new BadRequestException(result.errors[0].message);
    }

    if (result.meta.failed > 0 || result.data.length === 0) {
      throw new BadRequestException('Failed to create subscription');
    }

    const subscription = result.data[0];

    return {
      id: subscription._id,
      identifier: subscription.identifier,
      name: subscription.name,
      preferences: subscription.preferences,
    };
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Patch('/topics/:topicKey/subscriptions/:identifier')
  async updateTopicSubscription(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('topicKey') topicKey: string,
    @Param('identifier') identifier: string,
    @Body() body: UpdateSubscriptionRequestDto
  ): Promise<SubscriptionDetailsResponseDto> {
    const subscription = await this.updateSubscriptionUsecase.execute(
      UpdateSubscriptionCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        userId: subscriberSession._id,
        topicKey,
        identifier,
        name: body.name,
        preferences: body.preferences ? this.convertPreferencesToGroupFilters(body.preferences) : undefined,
        contextKeys: subscriberSession.contextKeys,
      })
    );

    return {
      id: subscription._id,
      identifier: subscription.identifier,
      name: subscription.name,
      preferences: subscription.preferences,
    };
  }

  @UseGuards(AuthGuard('subscriberJwt'))
  @Delete('/topics/:topicKey/subscriptions/:identifier')
  async deleteTopicSubscription(
    @SubscriberSession() subscriberSession: SubscriberSession,
    @Param('topicKey') topicKey: string,
    @Param('identifier') identifier: string
  ): Promise<{ success: boolean }> {
    return await this.deleteTopicSubscriptionUsecase.execute(
      DeleteTopicSubscriptionCommand.create({
        environmentId: subscriberSession._environmentId,
        organizationId: subscriberSession._organizationId,
        subscriberId: subscriberSession.subscriberId,
        topicKey,
        identifier,
        _subscriberId: subscriberSession._id,
        contextKeys: subscriberSession.contextKeys,
      })
    );
  }

  private convertPreferencesToGroupFilters(
    preferences: Array<string | WorkflowPreferenceRequestDto | GroupPreferenceFilterDto>
  ): Array<GroupPreferenceFilterDto> {
    return preferences.map((preference) => {
      if (typeof preference === 'string') {
        return {
          filter: {
            workflowIds: [preference],
          },
        };
      }

      if (this.isGroupPreferenceFilter(preference)) {
        return preference;
      }

      return {
        filter: {
          workflowIds: [preference.workflowId],
        },
        condition: preference.condition,
        enabled: preference.enabled,
      };
    });
  }

  private isGroupPreferenceFilter(
    preference: WorkflowPreferenceRequestDto | GroupPreferenceFilterDto
  ): preference is GroupPreferenceFilterDto {
    return 'filter' in preference;
  }
}
