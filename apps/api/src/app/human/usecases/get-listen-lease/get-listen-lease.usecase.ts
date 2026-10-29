import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { ListenLeaseStatusResponseDto } from '../../dtos/human-listen.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanListenLeaseService } from '../../services/human-listen-lease.service';
import { GetListenLeaseCommand } from './get-listen-lease.command';

/**
 * Where the agent is listening now, for `agentinbox listen status`: `null` when no computer holds a live lease. Also
 * whether it is paused, which a paused agent's hosts may ask too.
 */
@Injectable()
export class GetListenLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanListenLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetListenLeaseCommand): Promise<ListenLeaseStatusResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return this.lease.status(scope, agent);
  }
}
