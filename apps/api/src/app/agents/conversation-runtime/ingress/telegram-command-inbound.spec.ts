import { expect } from 'chai';
import { esmImport } from '../../shared/util/esm-import';

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
