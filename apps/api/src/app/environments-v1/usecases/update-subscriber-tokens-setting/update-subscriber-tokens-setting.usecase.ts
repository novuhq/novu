import { Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { SubscriberTokensSettingResponseDto } from '../../dtos/subscriber-tokens-setting.dto';
import { UpdateSubscriberTokensSettingCommand } from './update-subscriber-tokens-setting.command';

@Injectable()
export class UpdateSubscriberTokensSetting {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UpdateSubscriberTokensSettingCommand): Promise<SubscriberTokensSettingResponseDto> {
    const scope = { _id: command.environmentId, _organizationId: command.organizationId };
    const previous = await this.environmentRepository.findOne(scope, 'subscriberTokens');

    if (!previous) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    const previousRequiredAt = previous.subscriberTokens?.requiredAt;
    let requiredAt: Date | undefined;
    let changed: boolean;

    if (command.required) {
      // Only an environment that is still off gets a timestamp, so repeated or concurrent turn-ons keep the first one.
      const turnedOn = await this.environmentRepository.findOneAndUpdate(
        { ...scope, 'subscriberTokens.requiredAt': { $exists: false } },
        { $set: { 'subscriberTokens.requiredAt': new Date() } },
        { new: true, projection: { subscriberTokens: 1 } }
      );
      // A null result means it was already on, possibly set by a concurrent request after the read above.
      const current = turnedOn ?? (await this.environmentRepository.findOne(scope, 'subscriberTokens'));
      requiredAt = current?.subscriberTokens?.requiredAt;
      changed = Boolean(turnedOn);
    } else {
      const { modified } = await this.environmentRepository.update(
        { ...scope, subscriberTokens: { $exists: true } },
        { $unset: { subscriberTokens: '' } }
      );
      changed = modified > 0;
    }

    this.inMemoryLRUCacheService.invalidate(
      InMemoryLRUCacheStore.ENVIRONMENT,
      `${command.organizationId}:${command.environmentId}`
    );

    this.logger.info(
      {
        event: 'environment.subscriber_tokens.updated',
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        required: command.required,
        changed,
        requiredAt: requiredAt ?? null,
        previousRequiredAt: previousRequiredAt ?? null,
      },
      'Updated the require signed subscriber tokens setting'
    );

    return { required: command.required, requiredAt };
  }
}
