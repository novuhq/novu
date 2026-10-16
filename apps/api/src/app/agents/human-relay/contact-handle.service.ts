import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository, type SubscriberEntity } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { WebClient } from '@slack/web-api';
import type { Message } from 'chat';
import {
  type ContactHandle,
  contactHandleUpdate,
  readContactHandle,
  slackDisplayNameOf,
  slackDisplayNameOfUser,
  slackWorkspaceDomainOfAction,
  slackWorkspaceDomainOfUrl,
  telegramHandleOf,
} from '../../human/services/contact-handle';
import { AgentConfigResolver, type ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { isAgentProvisionedSubscriber } from '../conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { asRecord } from '../shared/util/raw-record';
import { extractSlackTeamId } from '../shared/util/workspace-id';

/** A Slack lookup only fills a gap, so it gives up quickly rather than hold the message up. */
const SLACK_LOOKUP_TIMEOUT_MS = 5_000;

const HANDLE_ENDPOINTS = {
  [AgentPlatformEnum.TELEGRAM]: { type: ENDPOINT_TYPES.TELEGRAM_CHAT, identityField: 'chatId' },
  [AgentPlatformEnum.SLACK]: { type: ENDPOINT_TYPES.SLACK_USER, identityField: 'userId' },
} as const;

/** Who wrote or pressed a button, and what the platform sent with it. */
export type ContactHandleSource = {
  config: ResolvedAgentConfig;
  subscriberId?: string | null;
  /** The subscriber who wrote, when known: one an agent made up for an unknown sender is a stranger. */
  subscriber?: Pick<SubscriberEntity, 'data'> | null;
  /** Their Telegram chat id or Slack user id. */
  platformUserId?: string;
  /** What they wrote, when they wrote. */
  message?: Message | null;
  /** The platform's own payload for a button press (a Telegram callback query, a Slack `block_actions`). */
  actionRaw?: unknown;
};

/**
 * Keeps how an Agent Inbox contact shows on Telegram and Slack (`@dima`, `dima · acme.slack.com`) on their
 * channel endpoint, so the contact card can say it. People change their names, so it is read again every time
 * they write or press a button. Only relay agents keep it, and nothing here ever stops the message.
 */
@Injectable()
export class ContactHandleService {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  refreshFromTurn(turn: ConversationTurn): Promise<void> {
    return this.refresh({
      config: turn.config,
      subscriberId: turn.subscriber?.subscriberId,
      subscriber: turn.subscriber,
      platformUserId: turn.platformUserId,
      message: turn.message,
      actionRaw: turn.actionRaw,
    });
  }

  async refresh(source: ContactHandleSource): Promise<void> {
    const { config, subscriberId, platformUserId } = source;
    const target = HANDLE_ENDPOINTS[config.platform as keyof typeof HANDLE_ENDPOINTS];

    if (!config.isHumanRelay || !target || !subscriberId || !platformUserId) {
      return;
    }

    // Only contacts: someone the operator added. A stranger who wrote while Who can reach is Anyone gets a
    // subscriber made up for them; their handle isn't kept, and Slack isn't asked about them.
    if (source.subscriber && isAgentProvisionedSubscriber(source.subscriber)) {
      return;
    }

    try {
      const endpoint = await this.channelEndpointRepository.findOne(
        {
          _environmentId: config.environmentId,
          _organizationId: config.organizationId,
          integrationIdentifier: config.integrationIdentifier,
          subscriberId,
          type: target.type,
          [`endpoint.${target.identityField}`]: platformUserId,
        },
        '_id endpoint'
      );
      if (!endpoint) {
        return;
      }

      const stored = readContactHandle(endpoint.endpoint);
      const next =
        config.platform === AgentPlatformEnum.TELEGRAM
          ? telegramHandleOf(asRecord(source.message?.raw)?.from ?? asRecord(source.actionRaw)?.from)
          : await this.slackHandle(source, platformUserId, stored);
      const update = next ? contactHandleUpdate(stored, next) : null;

      if (update) {
        await this.channelEndpointRepository.update(
          { _id: endpoint._id, _environmentId: config.environmentId, _organizationId: config.organizationId },
          update
        );
      }
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), platform: config.platform },
        'Could not keep the contact’s handle; the message goes on without it'
      );
    }
  }

  /**
   * A message brings the display name and a button press the workspace, both for free. Slack is only asked for
   * the one that is still missing: `users.info` for the name, `auth.test` (no extra scope) for the workspace.
   */
  private async slackHandle(
    source: ContactHandleSource,
    userId: string,
    stored: ContactHandle
  ): Promise<ContactHandle> {
    let displayName = source.message ? slackDisplayNameOf(source.message.author) : undefined;
    let workspaceDomain = slackWorkspaceDomainOfAction(source.actionRaw);
    const needsName = !displayName && !stored.displayName;
    const needsDomain = !workspaceDomain && !stored.workspaceDomain;

    if (needsName || needsDomain) {
      const client = await this.slackClient(source);
      if (client) {
        // Each lookup fails on its own, and is logged: the other one's answer is still kept.
        const [user, auth] = await Promise.all([
          needsName
            ? client.users.info({ user: userId }).catch((err: unknown) => this.slackLookupFailed('users.info', err))
            : undefined,
          needsDomain
            ? client.auth.test().catch((err: unknown) => this.slackLookupFailed('auth.test', err))
            : undefined,
        ]);
        displayName ??= slackDisplayNameOfUser(user?.user);
        workspaceDomain ??= slackWorkspaceDomainOfUrl(auth?.url);
      }
    }

    return {
      ...stored,
      ...(displayName ? { displayName } : {}),
      ...(workspaceDomain ? { workspaceDomain } : {}),
    };
  }

  /** Logs a Slack lookup that failed (a missing scope, a rate limit, a timeout) without its token. */
  private slackLookupFailed(method: 'users.info' | 'auth.test', err: unknown): undefined {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : undefined;
    const slackError = typeof err === 'object' && err !== null && 'data' in err ? asRecord(err.data)?.error : undefined;

    this.logger.warn(
      { method, code, slackError, err: err instanceof Error ? err.message : String(err) },
      'Could not ask Slack for a contact’s handle; keeping what is known'
    );

    return undefined;
  }

  private async slackClient({ config, message, actionRaw }: ContactHandleSource): Promise<WebClient | undefined> {
    const token = await this.agentConfigResolver.resolveSlackBotToken(
      config.environmentId,
      config.organizationId,
      config.integrationIdentifier,
      extractSlackTeamId(message?.raw ?? actionRaw) ?? undefined
    );

    if (!token) {
      return undefined;
    }

    return new WebClient(token, {
      timeout: SLACK_LOOKUP_TIMEOUT_MS,
      retryConfig: { retries: 0 },
      rejectRateLimitedCalls: true,
      ...(process.env.SLACK_API_URL ? { slackApiUrl: process.env.SLACK_API_URL } : {}),
    });
  }
}
