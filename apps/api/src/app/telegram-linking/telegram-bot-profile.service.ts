import { Injectable } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';
import Axios from 'axios';

import { buildTelegramBotApiUrl } from './telegram-webhook.utils';

const TELEGRAM_API_TIMEOUT_MS = 10_000;

/** Telegram's own limits for a bot's name, its description and the short one on its profile. */
const BOT_NAME_MAX_LENGTH = 64;
const BOT_DESCRIPTION_MAX_LENGTH = 512;
const BOT_SHORT_DESCRIPTION_MAX_LENGTH = 120;

export type TelegramBotProfileFields = {
  name?: string;
  description?: string;
  /** A picture kept in file storage. `null` takes the bot's picture away. */
  picture?: { storageKey: string; contentType: string } | null;
};

interface TelegramApiResponse {
  ok: boolean;
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

    if (picture === null) {
      return this.call(botToken, 'removeMyProfilePhoto', {});
    }

    try {
      const file = await this.storageService.getFile(picture.storageKey);
      const form = new FormData();
      form.append('photo', JSON.stringify({ type: 'static', photo: 'attach://picture' }));
      form.append('picture', new Blob([new Uint8Array(file)], { type: picture.contentType }), 'picture');

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
        { method: 'setMyProfilePhoto', reason: err instanceof Error ? err.message : String(err) },
        'Could not set the picture of a Telegram bot.'
      );
    }
  }

  private async call(botToken: string, method: string, body: Record<string, string>): Promise<void> {
    try {
      const { data } = await Axios.post<TelegramApiResponse>(buildTelegramBotApiUrl(botToken, method), body, {
        timeout: TELEGRAM_API_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: () => true,
      });

      if (!data?.ok) {
        this.logger.warn({ method, reason: data?.description }, 'Telegram refused a bot profile update.');
      }
    } catch (err) {
      // The request URL carries the bot token, so only the message is logged, never the error itself.
      this.logger.warn(
        { method, reason: err instanceof Error ? err.message : String(err) },
        'Could not reach Telegram to update a bot profile.'
      );
    }
  }
}
