import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { buildDashboardWebChatSubscriberId } from '@novu/shared';
import { DashboardInboxHashesResponseDto } from '../../dtos/dashboard-inbox-hashes-response.dto';
import { BuildDashboardInboxHashesCommand } from './build-dashboard-inbox-hashes.command';

/**
 * Signs, with the current environment's API key, the subscriber ids the dashboard opens Inbox and
 * web chat sessions as in that environment, so they pass the customer's HMAC settings.
 * Only ids derived from the session user are signed; signing caller-chosen values would let members
 * without API key access mint valid hashes for arbitrary subscribers.
 */
@Injectable()
export class BuildDashboardInboxHashes {
  constructor(private getDecryptedSecretKey: GetDecryptedSecretKey) {}

  async execute(command: BuildDashboardInboxHashesCommand): Promise<DashboardInboxHashesResponseDto> {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    return {
      subscriberHash: sign(secretKey, command.userId),
      webChatSubscriberHash: sign(secretKey, buildDashboardWebChatSubscriberId(command.userId)),
    };
  }
}

function sign(secretKey: string, value: string): string {
  const hash = createHash(secretKey, value);

  if (!hash) {
    throw new InternalServerErrorException('Failed to compute the dashboard Inbox hash');
  }

  return hash;
}
