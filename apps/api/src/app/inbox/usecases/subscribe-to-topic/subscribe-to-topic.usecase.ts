import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { SubscriptionDetailsResponseDto } from '../../../shared/dtos/subscription-details-response.dto';
import { NovuTokens } from '../../../shared/services/novu-tokens.service';
import {
  CreateSubscriptionsCommand,
  CreateSubscriptionsUsecase,
} from '../../../subscriptions/usecases/create-subscriptions';
import { convertPreferencesToGroupFilters } from '../../../subscriptions/utils/subscriptions';
import { SubscribeToTopicCommand } from './subscribe-to-topic.command';

@Injectable()
export class SubscribeToTopic {
  constructor(
    private novuTokens: NovuTokens,
    private createSubscriptionsUsecase: CreateSubscriptionsUsecase
  ) {}

  @InstrumentUsecase()
  async execute(command: SubscribeToTopicCommand): Promise<SubscriptionDetailsResponseDto> {
    const { request } = command;
    const { topicGrant } = request;
    if (topicGrant !== undefined) {
      this.assertTopicGrant(command, topicGrant);
    }

    const result = await this.createSubscriptionsUsecase.execute(
      CreateSubscriptionsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command._subscriberId,
        topicKey: command.topicKey,
        subscriptions: [{ subscriberId: command.subscriberId, identifier: request.identifier, name: request.name }],
        name: topicGrant === undefined ? request.topic?.name : undefined,
        preferences: request.preferences ? convertPreferencesToGroupFilters(request.preferences) : undefined,
        contextKeys: command.contextKeys,
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

  private assertTopicGrant(command: SubscribeToTopicCommand, topicGrant: string): void {
    const verification = this.novuTokens.verify('subscriberTopicGrant', topicGrant);
    const isForThisSubscription =
      'claims' in verification &&
      verification.claims.aud === 'novu' &&
      verification.claims.iss === command.environmentId &&
      verification.claims.sub === command.subscriberId &&
      verification.claims.topic === command.topicKey;
    if (!isForThisSubscription) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'The topic grant does not allow this subscription.',
        error: 'topic_grant_invalid',
      });
    }

    if (!verification.ok) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'The topic grant has expired.',
        error: 'topic_grant_expired',
      });
    }
  }
}
