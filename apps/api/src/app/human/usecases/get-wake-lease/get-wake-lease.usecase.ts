import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { WakeLeaseStatusResponseDto } from '../../dtos/human-wake.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanWakeLeaseService } from '../../services/human-wake-lease.service';
import { GetWakeLeaseCommand } from './get-wake-lease.command';

/**
 * Where the agent is awake now, for `agentinbox wake status`: `null` when no computer holds a live lease. Also
 * whether it is paused, which a paused agent's hosts may ask too.
 */
@Injectable()
export class GetWakeLease {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanWakeLeaseService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetWakeLeaseCommand): Promise<WakeLeaseStatusResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return this.lease.status(scope, agent);
  }
}
