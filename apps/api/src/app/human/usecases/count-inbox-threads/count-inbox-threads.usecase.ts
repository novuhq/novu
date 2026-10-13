import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { InboxCountsResponseDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { InboxViewCommand } from '../list-inbox-threads/list-inbox-threads.command';

/** The numbers on the tabs and on the channel filter of the inbox page, for the same filters the list takes. */
@Injectable()
export class CountInboxThreads {
  constructor(private readonly inbox: HumanInboxService) {}

  @InstrumentUsecase()
  async execute(command: InboxViewCommand): Promise<InboxCountsResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);

    return this.inbox.countThreads(scope, agent, {
      senders: command.senders ?? 'contacts',
      tab: command.tab,
      channel: command.channel,
      search: command.search?.trim() || undefined,
    });
  }
}
