import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { ReleaseWakeLeaseResponseDto } from '../../dtos/human-wake.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanWakeLeaseService } from '../../services/human-wake-lease.service';
import { ReleaseWakeLeaseCommand } from './release-wake-lease.command';

/** `agentinbox wake stop`: the computer lets go of the lease it holds for a host. Another holder's is never touched. */
@Injectable()
export class ReleaseWakeLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanWakeLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: ReleaseWakeLeaseCommand): Promise<ReleaseWakeLeaseResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return { released: await this.lease.release(scope, agent, { computerId: command.computerId, host: command.host }) };
  }
}
