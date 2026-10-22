import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createHash, decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { buildDashboardWebChatSubscriberId } from '@novu/shared';
import { BuildInboxSubscriberHashCommand } from './build-inbox-subscriber-hash.command';

export function isAllowedDashboardInboxSubscriberId(userId: string, subscriberId: string): boolean {
  return subscriberId === userId || subscriberId === buildDashboardWebChatSubscriberId(userId);
}

@Injectable()
export class BuildInboxSubscriberHash {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: BuildInboxSubscriberHashCommand): Promise<{ subscriberHash: string }> {
    if (!isAllowedDashboardInboxSubscriberId(command.userId, command.subscriberId)) {
      throw new ForbiddenException('Cannot mint an Inbox HMAC hash for this subscriber');
    }

    const apiKeys = await this.environmentRepository.getApiKeys(command.environmentId);
    const encryptedKey = apiKeys[0]?.key;

    if (!encryptedKey) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    const subscriberHash = createHash(decryptApiKey(encryptedKey), command.subscriberId);

    if (!subscriberHash) {
      throw new InternalServerErrorException('Failed to compute the Inbox subscriber hash');
    }

    return { subscriberHash };
  }
}
