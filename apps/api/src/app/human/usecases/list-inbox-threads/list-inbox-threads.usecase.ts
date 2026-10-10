import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationStatusEnum } from '@novu/dal';
import type { InboxStatusFilter, ListInboxResponseDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService, type InboxListFilters } from '../../services/human-inbox.service';
import { ListInboxThreadsCommand } from './list-inbox-threads.command';

const DEFAULT_LIMIT = 20;
export const INBOX_WAIT_POLL_INTERVAL_MS = 1500;

const STATUS_BY_FILTER: Record<InboxStatusFilter, ConversationStatusEnum | undefined> = {
  open: ConversationStatusEnum.ACTIVE,
  resolved: ConversationStatusEnum.RESOLVED,
  all: undefined,
};

/**
 * Lists the relay agent's threads: open ones from contacts unless the filters say otherwise. With
 * `waitSeconds`, holds the request until at least one thread matches or the time is up, so an
 * agent can block on `human inbox list --wait` cheaply.
 */
@Injectable()
export class ListInboxThreads {
  constructor(private readonly inbox: HumanInboxService) {}

  @InstrumentUsecase()
  async execute(command: ListInboxThreadsCommand): Promise<ListInboxResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const deadline = Date.now() + (command.waitSeconds ?? 0) * 1000;
    const filters: InboxListFilters = {
      read: command.filter === 'unread' || command.filter === 'read' ? command.filter : undefined,
      status: STATUS_BY_FILTER[command.status ?? 'open'],
      senders: command.senders ?? 'contacts',
      limit: command.limit ?? DEFAULT_LIMIT,
      after: command.after,
    };

    let page = await this.inbox.listThreads(scope, agent, filters);
    while (page.data.length === 0 && Date.now() + INBOX_WAIT_POLL_INTERVAL_MS <= deadline) {
      await sleep(INBOX_WAIT_POLL_INTERVAL_MS);
      page = await this.inbox.listThreads(scope, agent, filters);
    }

    return page;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
