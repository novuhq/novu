import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptApiKey } from '@novu/application-generic';
import { type AgentHostId, AgentRepository, EnvironmentRepository } from '@novu/dal';
import type { ConnectHostResponseDto } from '../../dtos/human-host.dto';
import {
  CONNECT_CODE_EXPIRED,
  HumanConnectCodeService,
  keyFingerprint,
} from '../../services/human-connect-code.service';
import { GENERAL_HOST, HumanHostStatusService } from '../../services/human-host-status.service';
import { ConnectHostCommand } from './connect-host.command';

/** Code on the 404 for a code whose agent was deleted after the code was made. */
export const CONNECT_AGENT_GONE = 'connect_agent_gone';

/**
 * `agentinbox connect <agent> --code <code>`: trades a one-time code for the key of the agent's account,
 * the same key `agentinbox login` saves, so the CLI on that computer acts as the agent from then on. The
 * code is used up first, so a key is handed out at most once per code. The host counts as connected
 * through the CLI from here, before it has looked at the inbox: the host the CLI said it runs in, else the
 * one the code was made for, else `general`.
 */
@Injectable()
export class ConnectHost {
  constructor(
    private readonly connectCodes: HumanConnectCodeService,
    private readonly agentRepository: AgentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  async execute(command: ConnectHostCommand): Promise<ConnectHostResponseDto> {
    const target = await this.connectCodes.redeem(command.agent, command.code, command.clientIp);
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

    // The key is read once and checked against the one the code was made with: after the key was replaced,
    // say by someone cutting a host off, an older code must not hand out the new one.
    const environment = await this.environmentRepository.findOne(
      { _id: scope.environmentId, _organizationId: scope.organizationId },
      'apiKeys'
    );
    const current = environment?.apiKeys?.[0];
    if (!current || keyFingerprint(current) !== target.keyFingerprint) {
      throw new GoneException({
        message: 'This code was made before the account’s key changed. Ask for a new code on agentinbox.md.',
        code: CONNECT_CODE_EXPIRED,
      });
    }

    const apiKey = decryptApiKey(current.key);
    const host = connectingHost(command.host, target.host);
    await this.hostStatus.recordConnected(scope, agent._id, { via: 'cli', id: host });

    return {
      apiKey,
      environmentId: scope.environmentId,
      agent: { identifier: agent.identifier, name: agent.name, handle: target.handle },
      host,
    };
  }
}

/**
 * The host the CLI said it runs in wins over the one the code was made for: it is what runs the command. A
 * CLI that could only say `general` knows less than the code does.
 */
function connectingHost(said: AgentHostId | undefined, codeFor: AgentHostId | undefined): AgentHostId {
  if (said && said !== GENERAL_HOST) {
    return said;
  }

  return codeFor ?? GENERAL_HOST;
}
