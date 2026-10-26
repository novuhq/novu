import { ForbiddenException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import type { WakeLeaseResponseDto } from '../../dtos/human-wake.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanWakeLeaseService, WAKE_NEEDS_ACCOUNT } from '../../services/human-wake-lease.service';
import { TakeWakeLeaseCommand } from './take-wake-lease.command';

/**
 * `agentinbox wake` keeps the agent awake on its computer: it takes the lease, renews it every minute, and with
 * `takeOver` takes it from the computer that holds it. Another computer's live lease is a 409 `awake_elsewhere`.
 * A keyless setup can't keep a host awake: its few free messages would go on the first wakes.
 */
@Injectable()
export class TakeWakeLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanWakeLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: TakeWakeLeaseCommand): Promise<WakeLeaseResponseDto> {
    if (isKeylessOrganization(command.organizationId)) {
      throw new ForbiddenException({
        code: WAKE_NEEDS_ACCOUNT,
        message: 'Keeping a host awake needs an Agent Inbox account. Run `npx @agentinbox/cli login` first.',
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
