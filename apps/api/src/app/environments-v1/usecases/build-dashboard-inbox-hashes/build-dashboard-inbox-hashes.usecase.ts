import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { createHash, GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { buildDashboardWebChatSubscriberId } from '@novu/shared';
import { DashboardInboxHashesResponseDto } from '../../dtos/dashboard-inbox-hashes-response.dto';
import { BuildDashboardInboxHashesCommand } from './build-dashboard-inbox-hashes.command';

/**
 * Signs, with the current environment's API key, the identities the dashboard opens Inbox and
 * web chat sessions as in that environment, so they pass the customer's HMAC settings.
 * Subscriber ids come only from the session; an agent is signed only if it belongs to the environment.
 */
@Injectable()
export class BuildDashboardInboxHashes {
  constructor(
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private agentRepository: AgentRepository
  ) {}

  async execute(command: BuildDashboardInboxHashesCommand): Promise<DashboardInboxHashesResponseDto> {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );
    const subscriberHash = sign(secretKey, command.userId);
    const webChatSubscriberHash = sign(secretKey, buildDashboardWebChatSubscriberId(command.userId));

    if (!command.agentIdentifier) {
      return { subscriberHash, webChatSubscriberHash };
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent ${command.agentIdentifier} not found`);
    }

    return { subscriberHash, webChatSubscriberHash, agentHash: sign(secretKey, command.agentIdentifier) };
  }
}

function sign(secretKey: string, value: string): string {
  const hash = createHash(secretKey, value);

  if (!hash) {
    throw new InternalServerErrorException('Failed to compute the dashboard Inbox hash');
  }

  return hash;
}
