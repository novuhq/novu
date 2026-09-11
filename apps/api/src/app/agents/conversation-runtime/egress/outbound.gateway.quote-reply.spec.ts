import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from './outbound.gateway';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

describe('OutboundGateway quote-reply routing', () => {
  const postArg = { markdown: 'answer' };
  const quoteMessageId = ' inbound-msg-1 ';

  function makeGateway() {
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    const gateway = new OutboundGateway(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new OutboundDeliveryInfo(),
      logger as any
    );

    return { gateway, logger };
  }

  it('uses thread.reply when quoteMessageId is provided and adapter supports it', async () => {
    const { gateway } = makeGateway();
    const reply = sinon.stub().resolves({ id: 'quoted-1', threadId: 'thread-1' });
    const post = sinon.stub().rejects(new Error('post should not be called'));
    const thread = { reply, post };

    const result = await (gateway as any).deliverThreadMessage(
      thread,
      AgentPlatformEnum.TELEGRAM,
      postArg,
      quoteMessageId
    );

    expect(reply.calledOnceWith('inbound-msg-1', postArg)).to.equal(true);
    expect(post.called).to.equal(false);
    expect(result).to.deep.equal({ id: 'quoted-1', threadId: 'thread-1' });
  });

  it('falls back to thread.post when reply throws NotImplementedError', async () => {
    const { gateway, logger } = makeGateway();
    const reply = sinon.stub().rejects(new NotImplementedError('reply'));
    const post = sinon.stub().resolves({ id: 'posted-1', threadId: 'thread-1' });
    const thread = { reply, post };

    const result = await (gateway as any).deliverThreadMessage(
      thread,
      AgentPlatformEnum.SLACK,
      postArg,
      quoteMessageId
    );

    expect(reply.calledOnceWith('inbound-msg-1', postArg)).to.equal(true);
    expect(post.calledOnceWith(postArg)).to.equal(true);
    expect(logger.debug.calledOnce).to.equal(true);
    expect(result).to.deep.equal({ id: 'posted-1', threadId: 'thread-1' });
  });

  it('rethrows non-NotImplementedError failures from thread.reply', async () => {
    const { gateway } = makeGateway();
    const reply = sinon.stub().rejects(new Error('network down'));
    const post = sinon.stub().resolves({ id: 'posted-1', threadId: 'thread-1' });
    const thread = { reply, post };

    let thrown: Error | undefined;
    try {
      await (gateway as any).deliverThreadMessage(thread, AgentPlatformEnum.WHATSAPP, postArg, quoteMessageId);
    } catch (err) {
      thrown = err as Error;
    }

    expect(thrown?.message).to.equal('network down');
    expect(post.called).to.equal(false);
  });

  it('uses thread.post when no quoteMessageId is provided', async () => {
    const { gateway } = makeGateway();
    const reply = sinon.stub().rejects(new Error('reply should not be called'));
    const post = sinon.stub().resolves({ id: 'posted-1', threadId: 'thread-1' });
    const thread = { reply, post };

    const result = await (gateway as any).deliverThreadMessage(thread, AgentPlatformEnum.TELEGRAM, postArg);

    expect(reply.called).to.equal(false);
    expect(post.calledOnceWith(postArg)).to.equal(true);
    expect(result).to.deep.equal({ id: 'posted-1', threadId: 'thread-1' });
  });
});
