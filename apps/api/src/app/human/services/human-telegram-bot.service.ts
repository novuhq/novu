import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, decryptCredentials, PinoLogger } from '@novu/application-generic';
import { type AgentEntity, AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { buildTelegramBotApiUrl } from '../../telegram-linking/telegram-webhook.utils';

/** A bot keeps its username, so one answer from Telegram serves a day of card views. */
const USERNAME_TTL_SECONDS = 24 * 60 * 60;

/** A card doesn't wait long for Telegram: without an answer, it leaves the Telegram line out. */
const TELEGRAM_TIMEOUT_MS = 3_000;

type TelegramGetMeResponse = { ok?: boolean; result?: { username?: string }; description?: string };

type BotAgent = Pick<AgentEntity, '_id' | '_environmentId' | '_organizationId'>;

/**
 * The username of the Telegram bot a relay agent talks through, for its public card. Telegram only tells it to
 * whoever holds the bot's token (`getMe`), so the answer is cached under a hash of the token: a new token is a
 * new key, and the token itself never goes into the cache.
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
    if (!botToken) {
      return undefined;
    }

    const key = `agent-inbox:telegram-bot-username:${createHash('sha256').update(botToken).digest('hex')}`;
    const cached = await this.readCache(key);
    if (cached) {
      return cached;
    }

    const username = await this.askTelegram(botToken);
    if (username) {
      await this.writeCache(key, username);
    }

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

  private async writeCache(key: string, username: string): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    try {
      await this.cacheService.set(key, username, { ttl: USERNAME_TTL_SECONDS });
    } catch {
      // Without the cache, the next card asks Telegram again.
    }
  }
}
