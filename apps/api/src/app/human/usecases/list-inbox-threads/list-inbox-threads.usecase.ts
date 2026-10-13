import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationStatusEnum } from '@novu/dal';
import type { InboxStatusFilter, InboxTab, ListInboxResponseDto } from '../../dtos/human-inbox.dto';
import {
  HumanInboxService,
  type InboxListFilters,
  type InboxRelayAgent,
  type InboxScope,
} from '../../services/human-inbox.service';
import { ListInboxThreadsCommand } from './list-inbox-threads.command';

const DEFAULT_LIMIT = 20;
export const INBOX_WAIT_POLL_INTERVAL_MS = 1500;
/** How many empty pages one request follows before it hands the cursor back to the caller. */
const MAX_EMPTY_PAGE_FOLLOWS = 4;

const STATUS_BY_FILTER: Record<InboxStatusFilter, ConversationStatusEnum | undefined> = {
  open: ConversationStatusEnum.ACTIVE,
  resolved: ConversationStatusEnum.RESOLVED,
  all: undefined,
};

/** What each tab of the inbox page lists, in the terms of the other filters. */
const FILTERS_BY_TAB: Record<InboxTab, Pick<InboxListFilters, 'read' | 'status' | 'waiting'>> = {
  all: {},
  unread: { read: 'unread', status: ConversationStatusEnum.ACTIVE },
  waiting: { waiting: true, status: ConversationStatusEnum.ACTIVE },
  resolved: { status: ConversationStatusEnum.RESOLVED },
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

    if (command.tab && (command.filter || command.status)) {
      throw new BadRequestException('`tab` cannot be combined with `filter` or `status`: a tab already says both.');
    }

    const filters: InboxListFilters = {
      ...(command.tab
        ? FILTERS_BY_TAB[command.tab]
        : {
            read: command.filter === 'unread' || command.filter === 'read' ? command.filter : undefined,
            status: STATUS_BY_FILTER[command.status ?? 'open'],
          }),
      senders: command.senders ?? 'contacts',
      channel: command.channel,
      search: command.search?.trim() || undefined,
      limit: command.limit ?? DEFAULT_LIMIT,
      after: command.after,
    };

    let page = await this.firstPageWithThreads(scope, agent, filters);
    while (page.data.length === 0 && Date.now() + INBOX_WAIT_POLL_INTERVAL_MS <= deadline) {
      await sleep(INBOX_WAIT_POLL_INTERVAL_MS);
      page = await this.firstPageWithThreads(scope, agent, filters);
    }

    return page;
  }

  /**
   * Some filters are applied after the query, so a page can come back empty while older threads
   * still match. Such a page carries `next`; it is followed a few times before an empty page is
   * handed to the caller, who can go on from its `next`.
   */
  private async firstPageWithThreads(
    scope: InboxScope,
    agent: InboxRelayAgent,
    filters: InboxListFilters
  ): Promise<ListInboxResponseDto> {
    let page = await this.inbox.listThreads(scope, agent, filters);

    for (let follow = 0; follow < MAX_EMPTY_PAGE_FOLLOWS && page.data.length === 0 && page.next; follow += 1) {
      page = await this.inbox.listThreads(scope, agent, { ...filters, after: page.next });
    }

    return page;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
