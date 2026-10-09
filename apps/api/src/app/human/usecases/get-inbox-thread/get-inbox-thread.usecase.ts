import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationActivityRepository } from '@novu/dal';
import type { GetInboxThreadResponseDto } from '../../dtos/human-inbox.dto';
import { HumanInboxService, toInboxMessage } from '../../services/human-inbox.service';
import { GetInboxThreadCommand } from './get-inbox-thread.command';

const DEFAULT_LIMIT = 20;

/** The thread's history, oldest first. Viewing the newest page marks the thread read. */
@Injectable()
export class GetInboxThread {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly activityRepository: ConversationActivityRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInboxThreadCommand): Promise<GetInboxThreadResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);

    const page = await this.activityRepository.findInboxMessages({
      ...scope,
      conversationId: conversation._id,
      limit: command.limit ?? DEFAULT_LIMIT,
      before: command.before,
    });

    if (!command.before) {
      await this.inbox.markRead(scope, conversation);
    }

    return {
      thread: await this.inbox.toThread(scope, conversation),
      messages: page.data.map(toInboxMessage).reverse(),
      hasMore: page.hasMore,
    };
  }
}
