import { ForbiddenException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import type { ListenLeaseResponseDto } from '../../dtos/human-listen.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanListenLeaseService, LISTEN_NEEDS_ACCOUNT } from '../../services/human-listen-lease.service';
import { TakeListenLeaseCommand } from './take-listen-lease.command';

/**
 * `agentinbox listen` keeps the agent listening on its computer: it takes the lease, renews it every minute, and with
 * `takeOver` takes it from the computer that holds it. Another computer's live lease is a 409 `listening_elsewhere`.
 * A keyless setup can't keep the agent listening: its few free messages would go on the first runs.
 */
@Injectable()
export class TakeListenLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanListenLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: TakeListenLeaseCommand): Promise<ListenLeaseResponseDto> {
    if (isKeylessOrganization(command.organizationId)) {
      throw new ForbiddenException({
        code: LISTEN_NEEDS_ACCOUNT,
        message: 'Keeping the agent listening needs an Agent Inbox account. Run `npx @agentinbox/cli login` first.',
      });
    }

    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return this.lease.take(
      scope,
      agent,
      {
        computerId: command.computerId,
        computerName: command.computerName,
        host: command.host,
        ...(command.project ? { project: command.project } : {}),
      },
      command.takeOver === true
    );
  }
}
