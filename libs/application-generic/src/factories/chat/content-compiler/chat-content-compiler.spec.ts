import { ChatProviderIdEnum } from '@novu/shared';
import { ChatContentCompiler } from './chat-content-compiler.service';
import type { CardElementLike } from './types';

// The underlying `cardToBlockKit` / `cardToAdaptiveCard` serializers live in
// ESM-only `@chat-adapter/*` packages; mocking them keeps the unit test
// hermetic and asserts we call the right serializer for each providerId.

jest.mock('./adapters/slack-compiler', () => ({
  compileCardToSlackBlocks: jest.fn(async () => [{ type: 'header', text: { type: 'plain_text', text: 'OK' } }]),
}));

jest.mock('./adapters/teams-compiler', () => ({
  compileCardToAdaptiveCard: jest.fn(async () => ({ type: 'AdaptiveCard', body: [] })),
}));

jest.mock('./adapters/discord-compiler', () => ({
  compileCardToDiscordEmbeds: jest.fn(() => [{ title: 'OK' }]),
}));

jest.mock('./adapters/plain-text-compiler', () => ({
  compileCardToText: jest.fn(async () => 'OK fallback text'),
}));

import { compileCardToSlackBlocks } from './adapters/slack-compiler';
import { compileCardToAdaptiveCard } from './adapters/teams-compiler';
import { compileCardToDiscordEmbeds } from './adapters/discord-compiler';

describe('ChatContentCompiler', () => {
  const sampleCard: CardElementLike = {
    type: 'card',
    title: 'Hello',
    children: [{ type: 'text', content: 'World' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('compileFor(Slack) produces blocks + text, skips Teams / Discord', async () => {
    const compiler = new ChatContentCompiler();
    const result = await compiler.compileFor(sampleCard, ChatProviderIdEnum.Slack);

    expect(result.text).toBe('OK fallback text');
    expect(result.slackBlocks).toBeDefined();
    expect(result.adaptiveCard).toBeUndefined();
    expect(result.discordEmbeds).toBeUndefined();
    expect(compileCardToSlackBlocks).toHaveBeenCalledTimes(1);
    expect(compileCardToAdaptiveCard).not.toHaveBeenCalled();
    expect(compileCardToDiscordEmbeds).not.toHaveBeenCalled();
  });

  it('compileFor(MsTeams) produces adaptiveCard + text', async () => {
    const compiler = new ChatContentCompiler();
    const result = await compiler.compileFor(sampleCard, ChatProviderIdEnum.MsTeams);

    expect(result.adaptiveCard).toEqual({ type: 'AdaptiveCard', body: [] });
    expect(result.slackBlocks).toBeUndefined();
  });

  it('compileFor(Discord) produces embeds + text', async () => {
    const compiler = new ChatContentCompiler();
    const result = await compiler.compileFor(sampleCard, ChatProviderIdEnum.Discord);

    expect(result.discordEmbeds).toEqual([{ title: 'OK' }]);
    expect(result.slackBlocks).toBeUndefined();
  });

  it('compileFor(unknown provider) returns text-only payload', async () => {
    const compiler = new ChatContentCompiler();
    const result = await compiler.compileFor(sampleCard, ChatProviderIdEnum.Mattermost);

    expect(result.text).toBe('OK fallback text');
    expect(result.slackBlocks).toBeUndefined();
    expect(result.adaptiveCard).toBeUndefined();
    expect(result.discordEmbeds).toBeUndefined();
  });

  it('compileAll produces payloads for every dialect in parallel', async () => {
    const compiler = new ChatContentCompiler();
    const result = await compiler.compileAll(sampleCard);

    expect(result.text).toBe('OK fallback text');
    expect(result.slackBlocks).toBeDefined();
    expect(result.adaptiveCard).toBeDefined();
    expect(result.discordEmbeds).toBeDefined();
  });
});
