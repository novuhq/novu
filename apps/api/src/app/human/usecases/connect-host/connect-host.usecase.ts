import { Injectable, NotFoundException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import type { ConnectHostResponseDto } from '../../dtos/human-host.dto';
import { HumanConnectCodeService } from '../../services/human-connect-code.service';
import { HumanHostStatusService } from '../../services/human-host-status.service';
import { ConnectHostCommand } from './connect-host.command';

/** Code on the 404 for a code whose agent was deleted after the code was made. */
export const CONNECT_AGENT_GONE = 'connect_agent_gone';

/**
 * `agentinbox connect <agent> --code <code>`: trades a one-time code for the key of the agent's account,
 * the same key `agentinbox login` saves, so the CLI on that computer acts as the agent from then on. The
 * code is used up first, so a key is handed out at most once per code. The host counts as connected
 * through the CLI from here, before it has looked at the inbox.
 */
@Injectable()
export class ConnectHost {
  constructor(
    private readonly connectCodes: HumanConnectCodeService,
    private readonly agentRepository: AgentRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  async execute(command: ConnectHostCommand): Promise<ConnectHostResponseDto> {
    const target = await this.connectCodes.redeem(command.agent, command.code);
    const scope = { environmentId: target.environmentId, organizationId: target.organizationId };
    const agent = await this.agentRepository.findOne(
      { _id: target.agentId, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      ['_id', 'identifier', 'name', 'runtime']
    );

    if (!agent || agent.runtime !== 'human_relay') {
      throw new NotFoundException({
        message: 'The agent this code was for no longer exists. Ask for a new code on agentinbox.md.',
        code: CONNECT_AGENT_GONE,
      });
    }

    const apiKey = await this.getDecryptedSecretKey.execute(GetDecryptedSecretKeyCommand.create(scope));
    await this.hostStatus.recordConnected(scope, agent._id, 'cli');

    return {
      apiKey,
      environmentId: scope.environmentId,
      agent: { identifier: agent.identifier, name: agent.name, handle: target.handle },
    };
  }
}
