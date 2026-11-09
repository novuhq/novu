import { Injectable } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';
import Axios from 'axios';

import { resolveHumanDashboardBaseUrl } from '../shared/helpers/resolve-human-dashboard-base-url';
import { buildTelegramBotApiUrl } from './telegram-webhook.utils';

const TELEGRAM_API_TIMEOUT_MS = 10_000;

/** A small file on the Agent Inbox dashboard: a setup doesn't wait long for something this optional. */
const DEFAULT_PICTURE_TIMEOUT_MS = 5_000;

/** Telegram's own limits for a bot's name, its description and the short one on its profile. */
const BOT_NAME_MAX_LENGTH = 64;
const BOT_DESCRIPTION_MAX_LENGTH = 512;
const BOT_SHORT_DESCRIPTION_MAX_LENGTH = 120;

export type TelegramBotProfileFields = {
  name?: string;
  description?: string;
  /**
   * A picture kept in file storage. `null` is for an agent whose own picture was taken away: it leaves the bot
   * and the default one goes there instead. `'default-if-none'` is for an agent with no picture: the default one
   * goes only on a bot with no photo at all, so a photo set in BotFather stays.
   */
  picture?: { storageKey: string; contentType: string } | null | 'default-if-none';
};

interface TelegramApiResponse<Result = true> {
  ok: boolean;
  result?: Result;
  description?: string;
}

/**
 * Sets what people see of a Telegram bot: its name, and the description shown in an empty chat and on
 * its profile. A bot starts with whatever was typed into BotFather.
 *
 * None of this is needed to deliver a message, and Telegram allows few name changes a day, so a
 * refusal is logged and nothing is thrown.
 */
@Injectable()
export class TelegramBotProfile {
  constructor(
    private readonly storageService: StorageService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async apply(botToken: string, { name, description, picture }: TelegramBotProfileFields): Promise<void> {
    const calls: Array<[method: string, body: Record<string, string>]> = [];

    if (name?.trim()) {
      calls.push(['setMyName', { name: name.trim().slice(0, BOT_NAME_MAX_LENGTH) }]);
    }

    if (description !== undefined) {
      const text = description.trim();
      calls.push(['setMyDescription', { description: text.slice(0, BOT_DESCRIPTION_MAX_LENGTH) }]);
      calls.push(['setMyShortDescription', { short_description: text.slice(0, BOT_SHORT_DESCRIPTION_MAX_LENGTH) }]);
    }

    await Promise.all([
      ...calls.map(([method, body]) => this.call(botToken, method, body)),
      this.applyPicture(botToken, picture),
    ]);
  }

  private async applyPicture(botToken: string, picture: TelegramBotProfileFields['picture']): Promise<void> {
    if (picture === undefined) {
      return;
    }

    if (picture === 'default-if-none' && !(await this.hasNoPhoto(botToken))) {
      return;
    }

    if (picture === null) {
      // First, so the picture its operator took away goes even if the default one can't be set.
      await this.call(botToken, 'removeMyProfilePhoto', {});
    }

    try {
      const { file, contentType } = await this.readPicture(picture);
      const form = new FormData();
      form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://picture' }));
      form.append('picture', new Blob([new Uint8Array(file)], { type: contentType }), 'picture');

      const response = await fetch(buildTelegramBotApiUrl(botToken, 'setMyProfilePhoto'), {
        method: 'POST',
        body: form,
        redirect: 'error',
        signal: AbortSignal.timeout(TELEGRAM_API_TIMEOUT_MS),
      });
      const data = (await response.json().catch(() => null)) as TelegramApiResponse | null;

      if (!data?.ok) {
        this.logger.warn(
          { method: 'setMyProfilePhoto', reason: data?.description },
          'Telegram refused a bot profile update.'
        );
      }
    } catch (err) {
      // The request URL carries the bot token, so only the message is logged, never the error itself.
      this.logger.warn(
        { method: 'setMyProfilePhoto', reason: failureReason(err, botToken) },
        'Could not set the picture of a Telegram bot.'
      );
    }
  }

  /**
   * Whether Telegram says plainly that the bot has no photo. Anything less counts as having one, so a failed
   * check never costs a bot the photo it was given in BotFather.
   */
  private async hasNoPhoto(botToken: string): Promise<boolean> {
    const bot = await this.call<{ id?: number }>(botToken, 'getMe', {});
    const photos = bot?.id
      ? await this.call<{ total_count?: number }>(botToken, 'getUserProfilePhotos', { user_id: bot.id, limit: 1 })
      : undefined;

    if (typeof photos?.total_count !== 'number') {
      this.logger.warn('Could not tell whether a Telegram bot has a photo, so it was left alone.');

      return false;
    }

    return photos.total_count === 0;
  }

  /** The agent's own picture, or the default one from the Agent Inbox dashboard. */
  private async readPicture(
    picture: Exclude<TelegramBotProfileFields['picture'], undefined>
  ): Promise<{ file: Buffer; contentType: string }> {
    if (picture && picture !== 'default-if-none') {
      return { file: await this.storageService.getFile(picture.storageKey), contentType: picture.contentType };
    }

    // Unlike the calls to Telegram this one follows redirects: with no address set it asks agentinbox.md,
    // which sends everyone to www, and it carries no token.
    const response = await fetch(`${resolveHumanDashboardBaseUrl()}/brand/agent-avatar.jpg`, {
      signal: AbortSignal.timeout(DEFAULT_PICTURE_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`The default picture answered with status ${response.status}.`);
    }

    return { file: Buffer.from(await response.arrayBuffer()), contentType: 'image/jpeg' };
  }

  private async call<Result = true>(
    botToken: string,
    method: string,
    body: Record<string, string | number>
  ): Promise<Result | undefined> {
    try {
      const { data } = await Axios.post<TelegramApiResponse<Result>>(buildTelegramBotApiUrl(botToken, method), body, {
        timeout: TELEGRAM_API_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: () => true,
      });

      if (!data?.ok) {
        this.logger.warn({ method, reason: data?.description }, 'Telegram refused a bot profile update.');

        return undefined;
      }

      return data.result;
    } catch (err) {
      // The request URL carries the bot token, so only the message is logged, never the error itself.
      this.logger.warn(
        { method, reason: failureReason(err, botToken) },
        'Could not reach Telegram to update a bot profile.'
      );

      return undefined;
    }
  }
}

/** What went wrong, fit for a log: an error's message can hold the request's URL, and with it the token. */
function failureReason(err: unknown, botToken: string): string {
  return (err instanceof Error ? err.message : String(err)).split(botToken).join('<bot token>');
}
