import { expect } from 'chai';
import type { SlashCommandEvent } from 'chat';
import { esmImport } from '../../shared/util/esm-import';
import { resolveTelegramCommandMessage } from './telegram-command-message';

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
};

function verbatimParagraph(value: string): MarkdownNode {
  return {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
  };
}

function commandEvent(text: string, fetched: { count: number }): SlashCommandEvent {
  return {
    command: '/start',
    text,
    user: { userId: 'u1', userName: 'ada', fullName: 'Ada', isBot: false, isMe: false },
    raw: { message_id: 7, chat: { id: 42 }, date: 1_700_000_000 },
    adapter: {
      fetchMessage: async () => {
        fetched.count += 1;

        return null;
      },
    },
  } as unknown as SlashCommandEvent;
}

describe('resolveTelegramCommandMessage fallback', () => {
  // Load the ESM modules up front so the timing check below measures parsing, not module loading.
  before(async () => {
    await Promise.all([esmImport('chat'), esmImport('@chat-adapter/telegram')]);
  });

  it('keeps short command text and matches parseMarkdown when the cached message is missing', async () => {
    const { parseMarkdown } = await esmImport('chat');
    const fetched = { count: 0 };
    const argument = '**hello** world';
    const message = await resolveTelegramCommandMessage(commandEvent(argument, fetched), '42');

    expect(fetched.count).to.equal(1);
    expect(message.text).to.equal(`/start ${argument}`);
    expect(message.formatted).to.deep.equal(parseMarkdown(message.text));
  });

  it('keeps an over-budget command argument as one text paragraph', async () => {
    const argument = ']'.repeat(15000);
    const fetched = { count: 0 };
    const startedAt = performance.now();
    const message = await resolveTelegramCommandMessage(commandEvent(argument, fetched), '42');
    const elapsedMs = performance.now() - startedAt;
    const text = `/start ${argument}`;

    expect(fetched.count).to.equal(1);
    expect(message.text).to.equal(text);
    expect(message.formatted).to.deep.equal(verbatimParagraph(text));
    // The unbounded parse takes about 2 s on this input.
    expect(elapsedMs).to.be.below(500);
  });
});
