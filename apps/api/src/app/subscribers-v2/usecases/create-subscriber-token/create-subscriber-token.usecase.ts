import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import {
  NovuTokens,
  SubscriberLoginClaims,
  SubscriberTopicGrantClaims,
  TOKEN_KINDS,
} from '../../../shared/services/novu-tokens.service';
import { CreateSubscriberTokenResponseDto } from '../../dtos/create-subscriber-token-response.dto';
import { CreateSubscriberTokenCommand } from './create-subscriber-token.command';

@Injectable()
export class CreateSubscriberToken {
  constructor(
    private novuTokens: NovuTokens,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: CreateSubscriberTokenCommand): Promise<CreateSubscriberTokenResponseDto> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SUBSCRIBER_TOKENS_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });
    if (!isEnabled) {
      throw new NotFoundException();
    }

    return command.request.topic === undefined
      ? this.mintLogin(command)
      : this.mintTopicGrant(command, command.request.topic);
  }

  private mintLogin(command: CreateSubscriberTokenCommand): CreateSubscriberTokenResponseDto {
    const { context, subscriber, expiresIn } = command.request;
    const scope = command.request.scope ?? [];
    const claims: SubscriberLoginClaims = {
      iss: command.environmentId,
      aud: 'novu',
      sub: command.subscriberId,
      ...(context && { context }),
      ...(subscriber && { subscriber }),
      scope,
      jti: randomUUID(),
    };
    const signed = this.novuTokens.sign(
      'subscriberLogin',
      claims,
      expiresIn ?? TOKEN_KINDS.subscriberLogin.maxLifetimeSeconds
    );
    const expiresAt = signed.expiresAt.toISOString();

    this.logger.info(
      {
        jti: claims.jti,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        scope,
        expiresAt,
      },
      'Subscriber login token created'
    );

    return { token: signed.token, expiresAt };
  }

  private mintTopicGrant(command: CreateSubscriberTokenCommand, topic: string): CreateSubscriberTokenResponseDto {
    const claims: SubscriberTopicGrantClaims = {
      iss: command.environmentId,
      aud: 'novu',
      sub: command.subscriberId,
      topic,
      jti: randomUUID(),
    };
    const signed = this.novuTokens.sign(
      'subscriberTopicGrant',
      claims,
      command.request.expiresIn ?? TOKEN_KINDS.subscriberTopicGrant.maxLifetimeSeconds
    );
    const expiresAt = signed.expiresAt.toISOString();

    this.logger.info(
      {
        jti: claims.jti,
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        topic,
        expiresAt,
      },
      'Subscriber topic grant created'
    );

    return { token: signed.token, expiresAt };
  }
}
