import { expect } from 'chai';
import { esmImport } from '../../shared/util/esm-import';
import { ChatInstanceRegistry } from './chat-instance.registry';

const SHORT_MARKDOWN = '**hello** world';

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

async function parseIncoming(text: string): Promise<{ text: string; formatted: MarkdownNode; elapsedMs: number }> {
  const { TelegramFormatConverter } = await esmImport('@chat-adapter/telegram');
  const converter = new TelegramFormatConverter();
  const startedAt = performance.now();
  const parsed = converter.parseIncoming(text);
  const elapsedMs = performance.now() - startedAt;

  return { text: parsed.text, formatted: parsed.formatted, elapsedMs };
}

describe('Telegram command fallback converter', () => {
  it('parses short markdown to the same AST as parseMarkdown', async () => {
    const { parseMarkdown } = await esmImport('chat');
    const parsed = await parseIncoming(SHORT_MARKDOWN);

    expect(parsed.formatted).to.deep.equal(parseMarkdown(SHORT_MARKDOWN));
  });

  it('keeps fifteen thousand closing brackets as one text paragraph', async () => {
    const text = ']'.repeat(15000);
    const parsed = await parseIncoming(text);

    expect(parsed.text).to.equal(text);
    expect(parsed.formatted).to.deep.equal(verbatimParagraph(text));
    expect(parsed.elapsedMs).to.be.below(100);
  });

  it('keeps twenty thousand letters as one text paragraph', async () => {
    const text = 'a'.repeat(20000);
    const parsed = await parseIncoming(text);

    expect(parsed.text).to.equal(text);
    expect(parsed.formatted).to.deep.equal(verbatimParagraph(text));
    expect(parsed.elapsedMs).to.be.below(100);
  });
});

type FallbackMessage = {
  text: string;
  formatted: MarkdownNode;
};

type FallbackRegistry = {
  resolveTelegramCommandMessage(event: unknown, threadId: string): Promise<FallbackMessage>;
};

function createRegistry(): FallbackRegistry {
  const logger = { setContext() {}, error() {} };
  const unused = {} as never;

  return new ChatInstanceRegistry(
    logger as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused
  ) as unknown as FallbackRegistry;
}

function commandEvent(text: string, fetched: { count: number }) {
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
  };
}

describe('resolveTelegramCommandMessage fallback', () => {
  const registry = createRegistry();

  it('keeps short command text and matches parseMarkdown when the cached message is missing', async () => {
    const { parseMarkdown } = await esmImport('chat');
    const fetched = { count: 0 };
    const argument = '**hello** world';
    const message = await registry.resolveTelegramCommandMessage(commandEvent(argument, fetched), '42');

    expect(fetched.count).to.equal(1);
    expect(message.text).to.equal(`/start ${argument}`);
    expect(message.formatted).to.deep.equal(parseMarkdown(message.text));
  });

  it('keeps an over-budget command argument as one text paragraph', async () => {
    const argument = ']'.repeat(15000);
    const fetched = { count: 0 };
    const startedAt = performance.now();
    const message = await registry.resolveTelegramCommandMessage(commandEvent(argument, fetched), '42');
    const elapsedMs = performance.now() - startedAt;
    const text = `/start ${argument}`;

    expect(fetched.count).to.equal(1);
    expect(message.text).to.equal(text);
    expect(message.formatted).to.deep.equal(verbatimParagraph(text));
    expect(elapsedMs).to.be.below(100);
  });
});
