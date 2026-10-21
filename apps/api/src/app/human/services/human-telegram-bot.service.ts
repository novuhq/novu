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

/** A bot's token is `{bot id}:{secret}`. The bot id is public: it is the bot's own Telegram user id. */
const BOT_TOKEN_PATTERN = /^(\d+):/;

type TelegramGetMeResponse = { ok?: boolean; result?: { username?: string }; description?: string };

type BotAgent = Pick<AgentEntity, '_id' | '_environmentId' | '_organizationId'>;

/**
 * The username of the Telegram bot a relay agent talks through, for its public card. Telegram only tells it to
 * whoever holds the bot's token (`getMe`), so the answer is cached under the bot's id, the public part of the
 * token: nothing of the secret goes into the cache. When Telegram names no bot, the card leaves it out for a few
 * minutes before Telegram is asked again, so a revoked token or an outage doesn't slow every card down.
 */
@Injectable()
export class HumanTelegramBotService {
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
    const botToken = await this.findBotToken(agent);
    const botId = botToken ? BOT_TOKEN_PATTERN.exec(botToken)?.[1] : undefined;
    if (!botToken || !botId) {
      return undefined;
    }

    const key = `agent-inbox:telegram-bot-username:${botId}`;
    const cached = await this.readCache(key);
    if (cached) {
      return cached === NO_USERNAME ? undefined : cached;
    }

    const username = await this.askTelegram(botToken);
    await this.writeCache(key, username ?? NO_USERNAME, username ? USERNAME_TTL_SECONDS : NO_USERNAME_TTL_SECONDS);

    return username;
  }

  /** The token of the agent's Telegram bot, when it has one that is switched on. */
  private async findBotToken(agent: BotAgent): Promise<string | undefined> {
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

    return bot ? decryptCredentials(bot.credentials ?? {}).apiToken || undefined : undefined;
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
      // The request URL carries the bot token, so only the message is logged, never the error itself.
      this.logger.warn(
        { reason: err instanceof Error ? err.message : String(err) },
        'Could not reach Telegram to read the username of an agent’s bot.'
      );

      return undefined;
    }
  }

  private async readCache(key: string): Promise<string | undefined> {
    if (!this.cacheService.cacheEnabled()) {
      return undefined;
    }

    try {
      return (await this.cacheService.get(key)) || undefined;
    } catch {
      return undefined;
    }
  }

  private async writeCache(key: string, value: string, ttl: number): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    try {
      await this.cacheService.set(key, value, { ttl });
    } catch {
      // Without the cache, the next card asks Telegram again.
    }
  }
}
