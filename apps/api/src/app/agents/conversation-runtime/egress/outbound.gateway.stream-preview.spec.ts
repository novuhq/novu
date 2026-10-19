import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import type { ConversationTarget } from './outbound.gateway';
import { OutboundGateway } from './outbound.gateway';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';

describe('OutboundGateway stream preview', () => {
  const agentId = 'agent1';
  const integrationIdentifier = 'slack-main';
  const platformThreadId = 'slack:C123:1783695626.846689';

  async function* chunks(): AsyncIterable<string> {
    yield 'Hel';
    yield 'lo';
  }

  function makeGateway(options: { platform?: AgentPlatformEnum; stream?: sinon.SinonStub } = {}) {
    const platform = options.platform ?? AgentPlatformEnum.SLACK;
    const stream = options.stream ?? sinon.stub().resolves({ id: 'native-ts', threadId: platformThreadId, raw: {} });
    const post = sinon.stub().resolves({ id: 'fallback-ts', threadId: platformThreadId });
    const withBotToken = sinon.stub().callsFake(async (_token: string, fn: () => Promise<unknown>) => fn());

    const agentConfigResolver = {
      resolve: sinon.stub().resolves({
        platform,
        environmentId: 'env-1',
        organizationId: 'org-1',
        integrationIdentifier,
        integrationId: 'integration-1',
      }),
      resolveSlackBotToken: sinon.stub().resolves('xoxb-test-token'),
    };
    const registry = {
      getOrCreate: sinon.stub().resolves({
        thread: () => ({ post }),
        getAdapter: () => ({ stream, withBotToken }),
      }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    const conversation = { findByPlatformThread: sinon.stub().resolves(null) };

    const gateway = new OutboundGateway(
      registry as any,
      conversation as any,
      agentConfigResolver as any,
      {} as any,
      {} as any,
      new OutboundDeliveryInfo(),
      logger as any
    );

    return { gateway, stream, post };
  }

  const slackTarget: ConversationTarget = {
    agentId,
    integrationIdentifier,
    platform: AgentPlatformEnum.SLACK,
    platformThreadId,
    workspaceId: 'T123',
    recipientPlatformUserId: 'U456',
  };

  it('streams natively with the Slack recipient context', async () => {
    const { gateway, stream, post } = makeGateway();

    const sent = await gateway.streamPreview(slackTarget, chunks());

    expect(sent.messageId).to.equal('native-ts');
    expect(post.called).to.equal(false);
    expect(stream.calledOnce).to.equal(true);
    expect(stream.firstCall.args[0]).to.equal(platformThreadId);
    expect(stream.firstCall.args[2]).to.deep.equal({ recipientUserId: 'U456', recipientTeamId: 'T123' });
  });

  it('posts the stream through the SDK when Slack declines to stream natively', async () => {
    const { gateway, stream, post } = makeGateway({ stream: sinon.stub().resolves(null) });

    const sent = await gateway.streamPreview(slackTarget, chunks());

    expect(stream.calledOnce).to.equal(true);
    expect(sent.messageId).to.equal('fallback-ts');
    expect(post.calledOnce).to.equal(true);
  });

  it('skips native streaming when the recipient is unknown', async () => {
    const { gateway, stream, post } = makeGateway();

    const sent = await gateway.streamPreview({ ...slackTarget, recipientPlatformUserId: undefined }, chunks());

    expect(stream.called).to.equal(false);
    expect(sent.messageId).to.equal('fallback-ts');
    expect(post.calledOnce).to.equal(true);
  });

  it('skips native streaming on platforms other than Slack', async () => {
    const { gateway, stream, post } = makeGateway({ platform: AgentPlatformEnum.TELEGRAM });

    const sent = await gateway.streamPreview(
      { ...slackTarget, platform: AgentPlatformEnum.TELEGRAM, platformThreadId: 'telegram:42' },
      chunks()
    );

    expect(stream.called).to.equal(false);
    expect(sent.messageId).to.equal('fallback-ts');
    expect(post.calledOnce).to.equal(true);
  });
});
