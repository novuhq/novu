import { Injectable } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { compileCardToSlackBlocks } from './adapters/slack-compiler';
import { compileCardToAdaptiveCard } from './adapters/teams-compiler';
import { compileCardToDiscordEmbeds } from './adapters/discord-compiler';
import { compileCardToText } from './adapters/plain-text-compiler';
import type { CardElementLike, CompiledChatContent, ProviderIdLike } from './types';

/**
 * Maps a Novu chat provider id to the rich-content dialect it understands.
 * Providers absent from this map just consume the `content: string` fallback.
 */
const PROVIDER_DIALECT: Partial<Record<ChatProviderIdEnum, 'slack' | 'msteams' | 'discord'>> = {
  [ChatProviderIdEnum.Slack]: 'slack',
  // `Novu` is the Novu-hosted Slack integration (provider id `novu-slack`)
  [ChatProviderIdEnum.Novu]: 'slack',
  [ChatProviderIdEnum.MsTeams]: 'msteams',
  [ChatProviderIdEnum.Discord]: 'discord',
};

@Injectable()
export class ChatContentCompiler {
  /**
   * Compile once, get payloads for every known dialect. Cheap — the send
   * path always knows its provider, but the renderer wants all three for
   * multi-platform preview.
   */
  async compileAll(card: CardElementLike): Promise<CompiledChatContent> {
    const [text, slackBlocks, adaptiveCard, discordEmbeds] = await Promise.all([
      compileCardToText(card),
      compileCardToSlackBlocks(card),
      compileCardToAdaptiveCard(card),
      Promise.resolve(compileCardToDiscordEmbeds(card)),
    ]);

    return {
      text,
      slackBlocks,
      adaptiveCard,
      discordEmbeds,
    };
  }

  /**
   * Compile only what the given provider needs, plus the text fallback.
   * Used by `SendMessageChat` to avoid wasted serialization work per
   * send (workers run hot).
   */
  async compileFor(card: CardElementLike, providerId: ProviderIdLike): Promise<CompiledChatContent> {
    const dialect = PROVIDER_DIALECT[providerId as ChatProviderIdEnum];
    const text = await compileCardToText(card);

    if (dialect === 'slack') {
      return { text, slackBlocks: await compileCardToSlackBlocks(card) };
    }

    if (dialect === 'msteams') {
      return { text, adaptiveCard: await compileCardToAdaptiveCard(card) };
    }

    if (dialect === 'discord') {
      return { text, discordEmbeds: compileCardToDiscordEmbeds(card) };
    }

    return { text };
  }
}
