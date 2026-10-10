import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { InboxThreadDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { InboxThreadCommand } from '../inbox-thread.command';

@Injectable()
export class MarkInboxRead {
  constructor(private readonly inbox: HumanInboxService) {}

  @InstrumentUsecase()
  async execute(command: InboxThreadCommand): Promise<InboxThreadDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);

    await this.inbox.markRead(scope, conversation);

    return this.inbox.toThread(scope, conversation);
  }
}
