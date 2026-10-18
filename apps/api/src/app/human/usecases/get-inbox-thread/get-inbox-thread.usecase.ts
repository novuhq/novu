import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ConversationActivityRepository } from '@novu/dal';
import type { GetInboxThreadResponseDto } from '../../dtos/human-inbox.dto';
import { HumanHostStatusService } from '../../services/human-host-status.service';
import { HumanInboxService } from '../../services/human-inbox.service';
import { GetInboxThreadCommand } from './get-inbox-thread.command';

const DEFAULT_LIMIT = 20;

/**
 * The thread's history, oldest first: the newest page, the page before `before`, or what came after
 * `after`, which is how a reader that stays on a thread picks up what is new. Each answer also has the
 * thread as it stands now. Looking at a thread is not a response, so it stays unread.
 */
@Injectable()
export class GetInboxThread {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetInboxThreadCommand): Promise<GetInboxThreadResponseDto> {
    if (command.before !== undefined && command.after !== undefined) {
      throw new BadRequestException(
        '`before` and `after` cannot be combined: a page goes back from one message or on from one.'
      );
    }

    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const conversation = await this.inbox.findThread(scope, agent, command.identifier);

    const page = await this.activityRepository.findInboxMessages({
      ...scope,
      conversationId: conversation._id,
      limit: command.limit ?? DEFAULT_LIMIT,
      before: command.before,
      after: command.after,
      includeSystem: command.include === 'system',
    });
    const thread = await this.inbox.toThread(scope, conversation);

    if (command.hostVia) {
      await this.hostStatus.recordCheck(scope, agent, command.hostVia, [thread]);
    }

    return {
      thread,
      messages: await this.inbox.toMessages(scope, agent, page.data),
      hasMore: page.hasMore,
      details: await this.inbox.toDetails(scope, agent, conversation, thread),
    };
  }
}
