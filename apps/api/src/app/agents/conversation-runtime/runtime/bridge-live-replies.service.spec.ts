import { PassThrough } from 'node:stream';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent } from '@novu/agent-event-protocol';
import type { LiveReply } from '@novu/thalamus/durable';
import { expect } from 'chai';
import sinon from 'sinon';
import { LiveReplyStreamer } from '../../managed-runtime/live-reply-streamer.service';
import type { AgentEventContext } from '../../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { readBridgeLiveReplies } from './bridge-live-replies.service';

const TURN_ID = 'conv-1:msg-1';
let sequence = 0;

function frame(event: AgentEvent): string {
  sequence += 1;
  const envelope = {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: 'conv-1',
    agentId: 'copilot',
    runId: 'run_1',
    turnId: TURN_ID,
    sequence,
    timestamp: new Date().toISOString(),
    event,
  };

  return `data: ${JSON.stringify(envelope)}\n\n`;
}

const start = frame({ type: 'message-start', messageId: 'm1' });
const delta = (text: string) => frame({ type: 'message-delta', messageId: 'm1', delta: text });

/** Drains a live reply the way the streamer does, so its producer never blocks. */
function collect(reply: LiveReply): Promise<string[]> {
  return (async () => {
    const chunks: string[] = [];
    for await (const chunk of reply) chunks.push(chunk);

    return chunks;
  })();
}

function read(body: PassThrough, isTurnAborted: () => Promise<boolean>) {
  const replies: LiveReply[] = [];
  const done = readBridgeLiveReplies(
    body,
    () => true,
    (_runId, _messageId, reply) => {
      replies.push(reply);
      void collect(reply);
    },
    isTurnAborted
  );

  return { replies, done };
}

describe('readBridgeLiveReplies', () => {
  it('ends an open reply with the text streamed so far once its turn is stopped, and ignores the rest', async () => {
    let stopped = false;
    const body = new PassThrough();
    const { replies, done } = read(body, async () => stopped);

    body.write(start);
    body.write(delta('Adding '));
    body.write(delta('an email step'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    stopped = true;
    await new Promise((resolve) => setTimeout(resolve, 650));

    body.write(delta(' and more after the stop'));
    body.end();
    await done;

    expect(replies).to.have.length(1);
    expect(await replies[0].final).to.equal('Adding an email step');
  });

  it('keeps the partial text when the bridge ends its response before the next check', async () => {
    const body = new PassThrough();
    const { replies, done } = read(body, async () => true);

    body.write(start);
    body.write(delta('Half a reply'));
    body.end();
    await done;

    expect(await replies[0].final).to.equal('Half a reply');
  });

  it('settles without text when the turn was not stopped, so the durable message delivers it', async () => {
    const body = new PassThrough();
    const { replies, done } = read(body, async () => false);

    body.write(start);
    body.write(delta('Still going'));
    body.end();
    await done;

    expect(await replies[0].final).to.equal(undefined);
  });

  it('keeps nothing for a reply stopped before its first text', async () => {
    const body = new PassThrough();
    const { replies, done } = read(body, async () => true);

    body.write(start);
    body.end();
    await done;

    expect(await replies[0].final).to.equal(undefined);
  });

  it('ends the stream once a reply streams more text than a reply may hold, even while it is read', async () => {
    const body = new PassThrough();
    const { replies, done } = read(body, async () => false);
    const failure = done.then(
      () => undefined,
      (err: Error) => err
    );
    const chunk = 'x'.repeat(512 * 1024);

    body.write(start);
    for (let i = 0; i < 5; i += 1) {
      body.write(delta(chunk));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    body.end();

    const error = await failure;

    expect(error?.message).to.equal('Bridge live reply is too long');
    expect(await replies[0].final).to.equal(undefined);
  });
});

/**
 * The reader wired to the real streamer, the way `AgentEventSink.startLiveReply` does it, with only the
 * outbound gateway and conversation lookups faked. The client sees the preview under the gateway's id, so the saved
 * reply must be delivered over that id for the client to merge the two.
 */
describe('readBridgeLiveReplies with the live reply streamer', () => {
  const PREVIEW_ID = 'act_preview';

  function setup() {
    const previewText: string[] = [];
    const deliver = sinon.stub().resolves();
    const outboundGateway = {
      streamPreview: sinon.stub().callsFake(async (_target: unknown, chunks: AsyncIterable<string>) => {
        for await (const chunk of chunks) previewText.push(chunk);

        return { messageId: PREVIEW_ID, platformThreadId: 'web_chat:conv_1' };
      }),
      deleteInConversation: sinon.stub().resolves(),
    };
    const conversationService = {
      getConversation: sinon.stub().resolves({ _agentId: 'agent-db-1' }),
      getPrimaryChannel: sinon.stub().returns({ platform: 'web_chat', platformThreadId: 'web_chat:conv_1' }),
      // The reply the streamer delivered over its preview carries the preview's id.
      findAgentMessageByIdentifier: sinon.stub().resolves({ platformMessageId: PREVIEW_ID }),
    };
    const streamer = new LiveReplyStreamer(
      conversationService as any,
      { assertOutboundWithinLimit: sinon.stub().resolves() } as any,
      outboundGateway as any,
      { setContext: sinon.stub(), warn: sinon.stub() } as any
    );
    const context = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      conversationId: 'conv-1',
      integrationIdentifier: 'web-chat',
      platform: AgentPlatformEnum.WEB_CHAT,
    } as AgentEventContext;

    const read = (body: PassThrough, isTurnAborted: () => Promise<boolean>) =>
      readBridgeLiveReplies(
        body,
        () => true,
        (_runId, messageId, reply) => streamer.start(context, messageId, deliver, () => reply),
        isTurnAborted
      );

    return { previewText, deliver, outboundGateway, streamer, read };
  }

  it('delivers the partial text of a stopped reply over the preview, as a finished reply is', async () => {
    let stopped = false;
    const { previewText, deliver, outboundGateway, streamer, read } = setup();
    const body = new PassThrough();
    const done = read(body, async () => stopped);

    body.write(start);
    body.write(delta('Below is a '));
    body.write(delta('comprehensive guide'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    stopped = true;
    await new Promise((resolve) => setTimeout(resolve, 650));
    body.end();
    await done;
    await streamer.onApplicationShutdown();

    expect(previewText.join('')).to.equal('Below is a comprehensive guide');
    expect(deliver.calledOnceWithExactly('Below is a comprehensive guide', PREVIEW_ID)).to.equal(true);
    expect(outboundGateway.deleteInConversation.called).to.equal(false);
  });

  it('delivers a finished reply over the preview the same way', async () => {
    const { deliver, streamer, read } = setup();
    const body = new PassThrough();
    const done = read(body, async () => false);

    body.write(start);
    body.write(delta('All of it'));
    body.write(frame({ type: 'message-end', messageId: 'm1', content: { markdown: 'All of it' } }));
    body.end();
    await done;
    await streamer.onApplicationShutdown();

    expect(deliver.calledOnceWithExactly('All of it', PREVIEW_ID)).to.equal(true);
  });
});
