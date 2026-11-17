import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import jwt from 'jsonwebtoken';
import { NovuTokens, TOKEN_KINDS } from '../../../shared/services/novu-tokens.service';
import { SubscriberLoginClaims } from '../../../shared/services/subscriber-login-token';
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

    const scope = command.scope ?? [];
    const claims: SubscriberLoginClaims = {
      iss: command.environmentId,
      aud: 'novu',
      sub: command.subscriberId,
      ...(command.context && { context: command.context }),
      ...(command.subscriber && { subscriber: command.subscriber }),
      scope,
      jti: randomUUID(),
    };

    const token = this.novuTokens.sign(
      'subscriberLogin',
      claims,
      command.expiresIn ?? TOKEN_KINDS.subscriberLogin.maxLifetimeSeconds
    );
    const { exp } = jwt.decode(token) as { exp: number };
    const expiresAt = new Date(exp * 1000).toISOString();

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

    return { token, expiresAt };
  }
}
