import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { LISTEN_MESSAGES_DEFAULT_LIMIT, type ListenMessagesResponseDto } from '../../dtos/human-listen.dto';
import { HumanHostStatusService } from '../../services/human-host-status.service';
import { HumanInboxService, type InboxRelayAgent, type InboxScope } from '../../services/human-inbox.service';
import { HumanListenAccessService } from '../../services/human-listen-access.service';
import { HumanListenLeaseService } from '../../services/human-listen-lease.service';
import {
  HumanListenMessagesService,
  LISTEN_MAX_AGE_MS,
  type ListenMessagesPage,
} from '../../services/human-listen-messages.service';
import {
  clampListenCursor,
  decodeListenCursor,
  encodeListenCursor,
  type ListenCursor,
} from '../../services/listen-cursor';
import { INBOX_WAIT_POLL_INTERVAL_MS } from '../list-inbox-threads/list-inbox-threads.usecase';
import { WaitForListenMessagesCommand } from './wait-for-listen-messages.command';

/**
 * The listener's wait: the messages that may start a host, from the people the agent listens to, oldest first,
 * after the cursor it passes. With `waitSeconds` the request is held until at least one comes or the time is up,
 * as `GET /human/inbox?wait=` holds. Only the computer and host that keep the agent listening may wait, and only
 * while the agent isn't paused: both are read again before each look, so a wait taken over or paused meanwhile
 * stops. Each wait counts as a last check of the host it is for.
 */
@Injectable()
export class WaitForListenMessages {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanListenLeaseService,
    private readonly access: HumanListenAccessService,
    private readonly messages: HumanListenMessagesService,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  @InstrumentUsecase()
  async execute(command: WaitForListenMessagesCommand): Promise<ListenMessagesResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const startedAt = Date.now();
    const holder = { computerId: command.computerId, host: command.host };
    await this.lease.assertHolds(scope, agent, holder);
    const deadline = startedAt + (command.waitSeconds ?? 0) * 1000;
    const limit = command.limit ?? LISTEN_MESSAGES_DEFAULT_LIMIT;
    // Without a cursor only what arrives from now on counts.
    let page = await this.look(
      scope,
      agent,
      command.after ? decodeListenCursor(command.after) : { at: startedAt },
      limit
    );

    while (page.data.length === 0) {
      // A look that stopped short has more to read right away; one that read everything waits for more.
      if (Date.now() + (page.more ? 0 : INBOX_WAIT_POLL_INTERVAL_MS) > deadline) {
        break;
      }

      if (!page.more) {
        await sleep(INBOX_WAIT_POLL_INTERVAL_MS);
      }

      await this.lease.assertHolds(scope, agent, holder);
      page = await this.look(scope, agent, page.next, limit);
    }

    // A wait shows no conversations: it isn't the first look at the inbox, whose waiting message onboarding shows.
    await this.hostStatus.recordCheck(
      scope,
      agent,
      { via: command.hostVia ?? 'cli', id: command.hostId ?? command.host },
      null
    );

    return { data: page.data, next: encodeListenCursor(page.next) };
  }

  /** Whom the agent listens to is read at every look, so a switch turned on or off counts at once. */
  private async look(
    scope: InboxScope,
    agent: InboxRelayAgent,
    cursor: ListenCursor,
    limit: number
  ): Promise<ListenMessagesPage> {
    const now = new Date();
    const listenedTo = await this.access.whoIsListenedTo(scope, agent);

    return this.messages.read(
      scope,
      agent,
      listenedTo,
      clampListenCursor(cursor, now.getTime() - LISTEN_MAX_AGE_MS, now.getTime()),
      limit,
      now
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
