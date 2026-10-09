import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationRepository } from '@novu/dal';
import type { ListInboxResponseDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService } from '../../services/human-inbox.service';
import { ListInboxThreadsCommand } from './list-inbox-threads.command';

const DEFAULT_LIMIT = 20;
export const INBOX_WAIT_POLL_INTERVAL_MS = 1500;

/**
 * Lists the relay agent's threads. With `waitSeconds`, holds the request until at least one thread
 * matches or the time is up, so an agent can block on `human inbox unread --wait` cheaply.
 */
@Injectable()
export class ListInboxThreads {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly conversationRepository: ConversationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ListInboxThreadsCommand): Promise<ListInboxResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const deadline = Date.now() + (command.waitSeconds ?? 0) * 1000;

    let page = await this.findPage(command, agent._id);
    while (page.data.length === 0 && Date.now() + INBOX_WAIT_POLL_INTERVAL_MS <= deadline) {
      await sleep(INBOX_WAIT_POLL_INTERVAL_MS);
      page = await this.findPage(command, agent._id);
    }

    return { data: await this.inbox.toThreads(scope, page.data), next: page.next };
  }

  private findPage(command: ListInboxThreadsCommand, agentId: string) {
    return this.conversationRepository.findInboxThreads({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId,
      unreadOnly: command.unreadOnly,
      includeResolved: command.includeResolved,
      limit: command.limit ?? DEFAULT_LIMIT,
      after: command.after,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
