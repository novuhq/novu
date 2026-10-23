import { Injectable } from '@nestjs/common';
import { CacheService, decryptCredentials, PinoLogger } from '@novu/application-generic';
import { type AgentEntity, AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { buildTelegramBotApiUrl } from '../../telegram-linking/telegram-webhook.utils';

/** A bot keeps its username, so one answer from Telegram serves a day of card views. */
const USERNAME_TTL_SECONDS = 24 * 60 * 60;

/** How long a bot Telegram didn't name stays off the card before Telegram is asked again. */
const NO_USERNAME_TTL_SECONDS = 10 * 60;

/** What the cache holds for a bot Telegram didn't name: never a username, which has only letters, digits and `_`. */
const NO_USERNAME = '-';

/** A card doesn't wait long for Telegram: without an answer, it leaves the Telegram line out. */
const TELEGRAM_TIMEOUT_MS = 3_000;

/**
 * A bot's token as Telegram linking accepts it: `{bot id}:{secret}`. The bot id is public, it is the bot's own
 * Telegram user id. A token of any other shape never goes into a request, so it can't end up in an error either.
 */
const BOT_TOKEN_PATTERN = /^(\d{8,}):[A-Za-z0-9_-]{35,}$/;

type TelegramGetMeResponse = { ok?: boolean; result?: { username?: string }; description?: string };

type BotAgent = Pick<AgentEntity, '_id' | '_environmentId' | '_organizationId'>;

/**
 * The username of the Telegram bot a relay agent talks through, for its public card, which anyone can open.
 * Telegram only tells it to whoever holds the bot's token (`getMe`), so a stranger's views mustn't reach Telegram
 * each time:
 * - each integration keeps its own answer for a day, under its id and the bot's id, the public part of the
 *   token. Nothing of the secret goes into the cache, and a token made up with another bot's id only ever
 *   changes its own card;
 * - a bot Telegram didn't name stays off the card for ten minutes before Telegram is asked again;
 * - views arriving together share one call to Telegram, and without a working cache Telegram isn't asked at all.
 */
@Injectable()
export class HumanTelegramBotService {
  /** Lookups on their way, by cache key. */
  private readonly lookups = new Map<string, Promise<string | undefined>>();

  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** The bot's username without the `@`, or nothing when the agent has no bot that Telegram answers for. */
  async usernameFor(agent: BotAgent): Promise<string | undefined> {
    const bot = await this.findBot(agent);
    const botId = bot ? BOT_TOKEN_PATTERN.exec(bot.token)?.[1] : undefined;
    if (!bot || !botId) {
      return undefined;
    }

    const key = `agent-inbox:telegram-bot-username:${bot.integrationId}:${botId}`;
    let lookup = this.lookups.get(key);
    if (!lookup) {
      lookup = this.lookUp(key, bot.token).finally(() => this.lookups.delete(key));
      this.lookups.set(key, lookup);
    }

    return lookup;
  }

  /** The agent's Telegram integration and its bot's token, when it has one that is switched on. */
  private async findBot(agent: BotAgent): Promise<{ integrationId: string; token: string } | undefined> {
    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    const links = await this.agentIntegrationRepository.find({ _agentId: agent._id, ...scope }, ['_integrationId']);
    if (links.length === 0) {
      return undefined;
    }

    const bot = await this.integrationRepository.findOne(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        providerId: ChatProviderIdEnum.Telegram,
        active: true,
        ...scope,
      },
      'credentials'
    );
    const token = bot ? decryptCredentials(bot.credentials ?? {}).apiToken : undefined;

    return bot && token ? { integrationId: bot._id, token } : undefined;
  }

  /** The cached answer, else Telegram's, kept for the next views. Nothing while the cache can't be used. */
  private async lookUp(key: string, botToken: string): Promise<string | undefined> {
    if (!this.cacheService.cacheEnabled()) {
      return undefined;
    }

    let cached: string | null;
    try {
      cached = await this.cacheService.get(key);
    } catch {
      return undefined;
    }

    if (cached) {
      return cached === NO_USERNAME ? undefined : cached;
    }

    const username = await this.askTelegram(botToken);
    try {
      await this.cacheService.set(key, username ?? NO_USERNAME, {
        ttl: username ? USERNAME_TTL_SECONDS : NO_USERNAME_TTL_SECONDS,
      });
    } catch {
      // Not kept: the next view asks Telegram again.
    }

    return username;
  }

  private async askTelegram(botToken: string): Promise<string | undefined> {
    try {
      const response = await fetch(buildTelegramBotApiUrl(botToken, 'getMe'), {
        redirect: 'error',
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      });
      const body = (await response.json()) as TelegramGetMeResponse;
      if (!body.ok || !body.result?.username) {
        this.logger.warn({ reason: body.description }, 'Telegram did not tell the username of an agent’s bot.');

        return undefined;
      }

      return body.result.username;
    } catch (err) {
      // An error's message can hold the request's URL, and with it the token: only whether it timed out is logged.
      this.logger.warn(
        { timedOut: (err as { name?: string } | null)?.name === 'TimeoutError' },
        'Could not reach Telegram to read the username of an agent’s bot.'
      );

      return undefined;
    }
  }
}
