import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { type ListWakeMessagesResponseDto, WAKE_MESSAGES_DEFAULT_LIMIT } from '../../dtos/human-wake.dto';
import { HumanHostStatusService } from '../../services/human-host-status.service';
import { HumanInboxService, type InboxRelayAgent, type InboxScope } from '../../services/human-inbox.service';
import { HumanWakeAccessService } from '../../services/human-wake-access.service';
import { HumanWakeLeaseService } from '../../services/human-wake-lease.service';
import {
  HumanWakeMessagesService,
  WAKE_MAX_AGE_MS,
  type WakeMessagesPage,
} from '../../services/human-wake-messages.service';
import { clampWakeCursor, decodeWakeCursor, encodeWakeCursor, type WakeCursor } from '../../services/wake-cursor';
import { INBOX_WAIT_POLL_INTERVAL_MS } from '../list-inbox-threads/list-inbox-threads.usecase';
import { WaitForWakeMessagesCommand } from './wait-for-wake-messages.command';

/**
 * The wake program's wait: the messages that may wake a host, from the people who can wake it, oldest first,
 * after the cursor it passes. With `waitSeconds` the request is held until at least one comes or the time is up,
 * as `GET /human/inbox?wait=` holds. Only the computer and host that keep the agent awake may wait, and only
 * while the agent isn't paused: both are read again before each look, so a wait taken over or paused meanwhile
 * stops. Each wait counts as a last check of the host it is for.
 */
@Injectable()
export class WaitForWakeMessages {
  constructor(
    private readonly inbox: HumanInboxService,
    private readonly lease: HumanWakeLeaseService,
    private readonly access: HumanWakeAccessService,
    private readonly messages: HumanWakeMessagesService,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  @InstrumentUsecase()
  async execute(command: WaitForWakeMessagesCommand): Promise<ListWakeMessagesResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, command.agentIdentifier);
    const startedAt = Date.now();
    const holder = { computerId: command.computerId, host: command.host };
    await this.lease.assertHolds(scope, agent, holder);
    const deadline = startedAt + (command.waitSeconds ?? 0) * 1000;
    const limit = command.limit ?? WAKE_MESSAGES_DEFAULT_LIMIT;
    // Without a cursor only what arrives from now on counts.
    let page = await this.look(
      scope,
      agent,
      command.after ? decodeWakeCursor(command.after) : { at: startedAt },
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

    return { data: page.data, next: encodeWakeCursor(page.next) };
  }

  /** Who can wake the host is read at every look, so a switch turned on or off counts at once. */
  private async look(
    scope: InboxScope,
    agent: InboxRelayAgent,
    cursor: WakeCursor,
    limit: number
  ): Promise<WakeMessagesPage> {
    const now = new Date();
    const wakers = await this.access.whoCanWake(scope, agent);

    return this.messages.read(
      scope,
      agent,
      wakers,
      clampWakeCursor(cursor, now.getTime() - WAKE_MAX_AGE_MS, now.getTime()),
      limit,
      now
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
