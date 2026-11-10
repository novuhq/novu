import * as chat from 'chat';
import { describe, expect, it } from 'vitest';
import { createInboundMarkdownParser } from './inbound-markdown.js';
import { MessageParser } from './message-parser.js';
import type { NovuEmailRawMessage } from './types.js';

const SHORT_MARKDOWN = '**hello** world';

function rawMessage(text: string): NovuEmailRawMessage {
  return {
    id: 'msg-1',
    messageId: '<msg-1@example.com>',
    from: 'Ada <ada@example.com>',
    to: ['agent@example.com'],
    subject: 'Hi',
    text,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function verbatimParagraph(value: string) {
  return {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
  };
}

function createParser(): MessageParser {
  const parser = new MessageParser();
  parser.setChatModule(chat.Message, createInboundMarkdownParser(chat));

  return parser;
}

function parse(parser: MessageParser, text: string) {
  return parser.parse(rawMessage(text), 'agent@example.com', 'email:thread');
}

describe('MessageParser inbound markdown', () => {
  it('keeps short markdown text and matches parseMarkdown', () => {
    const message = parse(createParser(), SHORT_MARKDOWN);

    expect(message.text).toBe(SHORT_MARKDOWN);
    expect(message.formatted).toEqual(chat.parseMarkdown(SHORT_MARKDOWN));
  });

  it('keeps fifteen thousand closing brackets as one text paragraph', () => {
    const text = ']'.repeat(15000);
    const parser = createParser();
    const startedAt = performance.now();
    const message = parse(parser, text);
    const elapsedMs = performance.now() - startedAt;

    expect(message.text).toBe(text);
    expect(message.formatted).toEqual(verbatimParagraph(text));
    expect(elapsedMs).toBeLessThan(100);
  });

  it('keeps twenty thousand letters as one text paragraph', () => {
    const text = 'a'.repeat(20000);
    const parser = createParser();
    const startedAt = performance.now();
    const message = parse(parser, text);
    const elapsedMs = performance.now() - startedAt;

    expect(message.text).toBe(text);
    expect(message.formatted).toEqual(verbatimParagraph(text));
    expect(elapsedMs).toBeLessThan(100);
  });
});
