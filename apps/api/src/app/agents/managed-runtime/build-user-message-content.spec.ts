import { type ContentPart, MessageRole } from '@novu/thalamus';
import { expect } from 'chai';
import type { StoredAttachment } from '../conversation-runtime/conversation/agent-attachment-storage.service';
import {
  applyUserContentToLatestUserTurn,
  buildUserMessageContent,
  preserveMediaThroughThalamusPacking,
} from './build-user-message-content';

function attachment(overrides: Partial<StoredAttachment> = {}): StoredAttachment {
  return {
    type: 'image',
    name: 'photo.png',
    mimeType: 'image/png',
    size: 1024,
    storageKey: 'org/env/agents/conv/msg/0-photo.png',
    ...overrides,
  };
}

describe('buildUserMessageContent', () => {
  const getBytes = async () => Buffer.from('hello');

  it('returns the plain text when there are no attachments', async () => {
    const content = await buildUserMessageContent({ userMessageText: 'hi', getBytes });

    expect(content).to.equal('hi');
  });

  it('returns the plain text when the attachment list is empty', async () => {
    const content = await buildUserMessageContent({ userMessageText: 'hi', attachments: [], getBytes });

    expect(content).to.equal('hi');
  });

  it('emits an image part before the text part for a whitelisted image', async () => {
    const content = await buildUserMessageContent({
      userMessageText: 'what is this?',
      attachments: [attachment()],
      getBytes,
    });

    expect(content).to.deep.equal([
      { type: 'image', data: Buffer.from('hello').toString('base64'), mediaType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ]);
  });

  it('emits a file part with the name for a PDF', async () => {
    const content = await buildUserMessageContent({
      userMessageText: 'summarize',
      attachments: [attachment({ type: 'file', name: 'report.pdf', mimeType: 'application/pdf' })],
      getBytes,
    });

    expect(content).to.deep.equal([
      {
        type: 'file',
        data: Buffer.from('hello').toString('base64'),
        mediaType: 'application/pdf',
        name: 'report.pdf',
      },
      { type: 'text', text: 'summarize' },
    ]);
  });

  it('normalizes media types with charset parameters and casing', async () => {
    const content = await buildUserMessageContent({
      userMessageText: 'look',
      attachments: [attachment({ mimeType: 'IMAGE/JPEG; charset=binary' })],
      getBytes,
    });

    expect(content).to.deep.equal([
      { type: 'image', data: Buffer.from('hello').toString('base64'), mediaType: 'image/jpeg' },
      { type: 'text', text: 'look' },
    ]);
  });

  it('orders multiple files before the single text part', async () => {
    const content = (await buildUserMessageContent({
      userMessageText: 'compare',
      attachments: [
        attachment({ name: 'a.png', mimeType: 'image/png' }),
        attachment({ type: 'file', name: 'b.pdf', mimeType: 'application/pdf' }),
      ],
      getBytes,
    })) as ContentPart[];

    expect(content.map((part) => part.type)).to.deep.equal(['image', 'file', 'text']);
  });

  it('falls back to text-only when the only attachment is an unsupported type', async () => {
    const content = await buildUserMessageContent({
      userMessageText: 'here is a file',
      attachments: [attachment({ type: 'file', name: 'notes.txt', mimeType: 'text/plain' })],
      getBytes,
    });

    expect(content).to.equal('here is a file');
  });

  it('skips unsupported attachments but keeps whitelisted ones', async () => {
    const content = (await buildUserMessageContent({
      userMessageText: 'mixed',
      attachments: [
        attachment({ type: 'file', name: 'notes.txt', mimeType: 'text/plain' }),
        attachment({ name: 'photo.png', mimeType: 'image/png' }),
      ],
      getBytes,
    })) as ContentPart[];

    expect(content.map((part) => part.type)).to.deep.equal(['image', 'text']);
  });

  it('skips a file whose known size exceeds the per-file cap without reading bytes', async () => {
    let called = false;
    const content = await buildUserMessageContent({
      userMessageText: 'big',
      attachments: [attachment({ size: 11 * 1024 * 1024 })],
      getBytes: async () => {
        called = true;

        return Buffer.from('hello');
      },
    });

    expect(called).to.equal(false);
    expect(content).to.equal('big');
  });

  it('skips an attachment that is missing from storage', async () => {
    const content = await buildUserMessageContent({
      userMessageText: 'gone',
      attachments: [attachment()],
      getBytes: async () => null,
    });

    expect(content).to.equal('gone');
  });

  it('omits an empty text part when the user sent only a file', async () => {
    const content = await buildUserMessageContent({
      userMessageText: '   ',
      attachments: [attachment()],
      getBytes,
    });

    expect(content).to.deep.equal([
      { type: 'image', data: Buffer.from('hello').toString('base64'), mediaType: 'image/png' },
    ]);
  });
});

describe('applyUserContentToLatestUserTurn', () => {
  it('leaves messages untouched for a plain-string body', () => {
    const messages = [
      { role: MessageRole.ASSISTANT, content: 'prior' },
      { role: MessageRole.USER, content: 'hi' },
    ];

    const result = applyUserContentToLatestUserTurn(messages, 'hi');

    expect(result).to.equal(messages);
    expect(result[1].content).to.equal('hi');
  });

  it('replaces only the latest user row content with parts', () => {
    const parts: ContentPart[] = [{ type: 'text', text: 'hi' }];
    const messages = [
      { role: MessageRole.USER, content: 'older' },
      { role: MessageRole.ASSISTANT, content: 'prior' },
      { role: MessageRole.USER, content: 'hi' },
    ];

    const result = applyUserContentToLatestUserTurn(messages, parts);

    expect(result[0].content).to.equal('older');
    expect(result[2].content).to.equal(parts);
  });
});

describe('preserveMediaThroughThalamusPacking', () => {
  it('leaves a lone user turn unchanged', () => {
    const parts: ContentPart[] = [
      { type: 'image', data: 'AAAA', mediaType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ];
    const messages = [{ role: MessageRole.USER, content: parts }];

    expect(preserveMediaThroughThalamusPacking(messages)).to.equal(messages);
  });

  it('leaves text-only history with a preceding assistant row unchanged', () => {
    const messages = [
      { role: MessageRole.ASSISTANT, content: 'Prior conversation' },
      { role: MessageRole.USER, content: 'hi' },
    ];

    expect(preserveMediaThroughThalamusPacking(messages)).to.equal(messages);
  });

  it('folds preceding assistant text into the user turn so image parts survive packing', () => {
    const parts: ContentPart[] = [
      { type: 'image', data: 'AAAA', mediaType: 'image/png' },
      { type: 'text', text: 'what is this?' },
    ];
    const messages = [
      { role: MessageRole.ASSISTANT, content: 'Prior conversation on this thread' },
      { role: MessageRole.USER, content: parts },
    ];

    expect(preserveMediaThroughThalamusPacking(messages)).to.deep.equal([
      {
        role: MessageRole.USER,
        content: [
          { type: 'image', data: 'AAAA', mediaType: 'image/png' },
          { type: 'text', text: 'Prior conversation on this thread\n\nwhat is this?' },
        ],
      },
    ]);
  });
});
