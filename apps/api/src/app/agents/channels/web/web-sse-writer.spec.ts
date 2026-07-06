import { expect } from 'chai';
import type { Response } from 'express';
import sinon from 'sinon';
import type { WebOutboundEvent } from './web-relay-events';
import { WebSseWriter, WebSseWriterOptions } from './web-sse-writer';

const OPTIONS: WebSseWriterOptions = {
  firstEventTimeoutMs: 10_000,
  settleMs: 1_000,
  idleTimeoutMs: 5_000,
  maxDurationMs: 60_000,
};

interface FakeResponse {
  res: Response;
  frames: () => Array<Record<string, unknown> | '[DONE]'>;
  ended: () => boolean;
  emitClose: () => void;
}

function createFakeResponse(): FakeResponse {
  const chunks: string[] = [];
  let ended = false;
  const closeListeners: Array<() => void> = [];

  const res = {
    status: sinon.stub().returnsThis(),
    setHeader: sinon.stub(),
    flushHeaders: sinon.stub(),
    on: (event: string, listener: () => void) => {
      if (event === 'close') closeListeners.push(listener);
    },
    write: (chunk: string) => {
      chunks.push(chunk);

      return true;
    },
    end: () => {
      ended = true;
    },
    get writableEnded() {
      return ended;
    },
  } as unknown as Response;

  return {
    res,
    frames: () =>
      chunks
        .map((chunk) => chunk.replace(/^data: /, '').trim())
        .filter(Boolean)
        .map((payload) =>
          payload === '[DONE]' ? ('[DONE]' as const) : (JSON.parse(payload) as Record<string, unknown>)
        ),
    ended: () => ended,
    emitClose: () => closeListeners.forEach((listener) => listener()),
  };
}

function messageEvent(markdown: string, messageId = 'web-1'): WebOutboundEvent {
  return { kind: 'message', messageId, content: { markdown }, ts: 1_700_000_000_000 };
}

describe('WebSseWriter', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('writes the protocol start frame on begin', () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    expect(fake.frames()[0]).to.deep.equal({ type: 'start' });
    expect(fake.ended()).to.equal(false);
  });

  it('streams a message as message-start + text frames and closes after settle', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.onRelayEvent(messageEvent('pong'));

    clock.tick(OPTIONS.settleMs + 1);
    await writer.done;

    const frames = fake.frames();
    const types = frames.map((frame) => (frame === '[DONE]' ? frame : frame.type));
    expect(types).to.deep.equal([
      'start',
      'data-message-start',
      'text-start',
      'text-delta',
      'text-end',
      'finish',
      '[DONE]',
    ]);

    const delta = frames.find((frame) => frame !== '[DONE]' && frame.type === 'text-delta') as Record<string, unknown>;
    expect(delta.delta).to.equal('pong');
    expect(delta.id).to.equal('web-1');
    expect(fake.ended()).to.equal(true);
  });

  it('emits card and files frames for rich replies', () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.onRelayEvent({
      kind: 'message',
      messageId: 'web-2',
      content: {
        card: { type: 'card', children: [] },
        files: [{ url: 'https://example.com/f.pdf', filename: 'f.pdf' }],
      },
      ts: 1_700_000_000_000,
    });

    const types = fake.frames().map((frame) => (frame === '[DONE]' ? frame : frame.type));
    expect(types).to.include('data-card');
    expect(types).to.include('data-files');
    // No markdown → no text block.
    expect(types).to.not.include('text-start');
  });

  it('does not settle-close while a typing indicator is active', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.onRelayEvent(messageEvent('first'));
    writer.onRelayEvent({ kind: 'typing', status: 'Thinking...', ts: 1 });

    clock.tick(OPTIONS.settleMs + 1);
    expect(fake.ended(), 'typing keeps the stream open past settle').to.equal(false);

    // A second reply lands, typing implicitly ends, then settle closes.
    writer.onRelayEvent(messageEvent('second', 'web-2'));
    clock.tick(OPTIONS.settleMs + 1);
    await writer.done;
    expect(fake.ended()).to.equal(true);
  });

  it('closes on idle timeout when typing never resolves', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.onRelayEvent(messageEvent('first'));
    writer.onRelayEvent({ kind: 'typing', status: 'Working', ts: 1 });

    clock.tick(OPTIONS.idleTimeoutMs + 1);
    await writer.done;
    expect(fake.ended()).to.equal(true);
  });

  it('closes on the first-event timeout when the agent never responds', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    clock.tick(OPTIONS.firstEventTimeoutMs + 1);
    await writer.done;

    expect(fake.ended()).to.equal(true);
    const types = fake.frames().map((frame) => (frame === '[DONE]' ? frame : frame.type));
    expect(types).to.deep.equal(['start', 'finish', '[DONE]']);
  });

  it('closes on the hard duration cap even with continuous activity', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    // Keep the idle timer perpetually reset with typing heartbeats.
    const heartbeats = Math.ceil(OPTIONS.maxDurationMs / OPTIONS.idleTimeoutMs) * 2;
    for (let i = 0; i < heartbeats; i += 1) {
      writer.onRelayEvent({ kind: 'typing', status: 'Working', ts: i });
      clock.tick(OPTIONS.idleTimeoutMs / 2);
      if (fake.ended()) break;
    }

    await writer.done;
    expect(fake.ended()).to.equal(true);
  });

  it('fail() writes an error frame then terminates the protocol', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.fail('boom');
    await writer.done;

    const types = fake.frames().map((frame) => (frame === '[DONE]' ? frame : frame.type));
    expect(types).to.deep.equal(['start', 'error', 'finish', '[DONE]']);
  });

  it('ignores relay events after the stream ended', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();
    writer.end();
    await writer.done;

    const framesBefore = fake.frames().length;
    writer.onRelayEvent(messageEvent('late'));
    expect(fake.frames().length).to.equal(framesBefore);
  });

  it('resolves done when the client disconnects', async () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    fake.emitClose();
    await writer.done;
    expect(fake.ended()).to.equal(true);
  });

  it('maps edit, delete, typing and reaction events to data frames', () => {
    const fake = createFakeResponse();
    const writer = new WebSseWriter(fake.res, OPTIONS);
    writer.begin();

    writer.onRelayEvent({ kind: 'edit', messageId: 'web-1', content: { markdown: 'edited' }, ts: 1 });
    writer.onRelayEvent({ kind: 'delete', messageId: 'web-1', ts: 2 });
    writer.onRelayEvent({ kind: 'typing', status: 'Thinking...', ts: 3 });
    writer.onRelayEvent({ kind: 'reaction', messageId: 'web-1', emoji: 'eyes', added: true, ts: 4 });

    const types = fake.frames().map((frame) => (frame === '[DONE]' ? frame : frame.type));
    expect(types).to.deep.equal(['start', 'data-message-edit', 'data-message-delete', 'data-typing', 'data-reaction']);
  });
});
