import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { ReleaseListenLeaseResponseDto } from '../../dtos/human-listen.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanListenLeaseService } from '../../services/human-listen-lease.service';
import { ReleaseListenLeaseCommand } from './release-listen-lease.command';

/** `agentinbox listen stop`: the computer lets go of the lease it holds for a host. Another holder's is never touched. */
@Injectable()
export class ReleaseListenLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanListenLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: ReleaseListenLeaseCommand): Promise<ReleaseListenLeaseResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return { released: await this.lease.release(scope, agent, { computerId: command.computerId, host: command.host }) };
  }
}
