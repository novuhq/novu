import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import type { ConnectCodeResponseDto } from '../../dtos/human-host.dto';
import { HumanConnectCodeService, keyFingerprint } from '../../services/human-connect-code.service';
import { HumanInboxService } from '../../services/human-inbox.service';
import { CreateConnectCodeCommand } from './create-connect-code.command';

/**
 * A one-time code that connects a host to the relay agent: `agentinbox connect <handle> --code <code>`.
 * The code hands out this environment's key, so only an account can ask for one, never a keyless setup.
 * Asking again within a few minutes gives the same code back, so a page can ask on every render.
 */
@Injectable()
export class CreateConnectCode {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly connectCodes: HumanConnectCodeService,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: CreateConnectCodeCommand): Promise<ConnectCodeResponseDto> {
    if (isKeylessOrganization(command.organizationId)) {
      throw new ForbiddenException(
        'Connecting an agent needs an Agent Inbox account. Run `npx @agentinbox/cli login` first.'
      );
    }

    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const [agent, environment] = await Promise.all([
      this.inbox.resolveRelayAgent(scope, command.agentIdentifier),
      this.environmentRepository.findOne(
        { _id: scope.environmentId, _organizationId: scope.organizationId },
        'apiKeys'
      ),
    ]);
    if (!environment) {
      throw new NotFoundException('This environment no longer exists.');
    }

    return this.connectCodes.issue({
      ...scope,
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      handle: command.handle,
      // The code only hands out the key that is current now: one replaced since makes it stale.
      keyFingerprint: keyFingerprint(environment.apiKeys?.[0]),
    });
  }
}
