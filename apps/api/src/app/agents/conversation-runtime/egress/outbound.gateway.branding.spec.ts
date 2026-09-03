import { expect } from 'chai';
import sinon from 'sinon';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { SLACK_MARKDOWN_TEXT_LIMIT } from '../../shared/util/slack-section-limits';
import { OutboundGateway } from './outbound.gateway';
import { OutboundDeliveryInfo } from './outbound-delivery-info.service';

describe('OutboundGateway branding', () => {
  function makeGateway() {
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };

    const gateway = new OutboundGateway(
      {} as any,
      {} as any,
      {} as any,
      { prepareContentForDelivery: sinon.stub().callsFake(async (content) => content) } as any,
      {} as any,
      new OutboundDeliveryInfo(),
      logger as any
    );

    return gateway;
  }

  const brandedSlack = {
    removeNovuBranding: false,
    agentIdentifier: 'my-agent',
    platform: AgentPlatformEnum.SLACK,
  };

  const unbrandedSlack = {
    removeNovuBranding: true,
    agentIdentifier: 'my-agent',
    platform: AgentPlatformEnum.SLACK,
  };

  it('keeps branded text replies on the markdown path instead of converting to a card', () => {
    const gateway = makeGateway();

    const postable = (gateway as any).buildAdapterPostableMessage({ markdown: 'Hello **world**' }, brandedSlack);

    expect(postable.card).to.equal(undefined);
    expect(postable.markdown).to.be.a('string');
    expect(postable.markdown).to.include('Hello **world**');
    expect(postable.markdown).to.include('Powered by [Novu](');
    expect(postable.markdown).to.include('go.novu.co/agent-powered');
  });

  it('leaves cards untouched so approval and connect cards keep their structure', () => {
    const gateway = makeGateway();
    const card = {
      type: 'card',
      children: [
        { type: 'text', content: 'Approve tool?' },
        {
          type: 'actions',
          children: [{ type: 'button', id: 'approve', label: 'Approve' }],
        },
      ],
    };

    const postable = (gateway as any).buildAdapterPostableMessage({ card }, brandedSlack);

    expect(postable.card).to.deep.equal(card);
    expect(postable.markdown).to.equal(undefined);
  });

  it('skips the watermark when removeNovuBranding is enabled', () => {
    const gateway = makeGateway();

    const postable = (gateway as any).buildAdapterPostableMessage({ markdown: 'Hello **world**' }, unbrandedSlack);

    expect(postable).to.deep.equal({ markdown: 'Hello **world**', files: undefined });
  });

  it('never appends the watermark on web chat, even for branded orgs', () => {
    const gateway = makeGateway();
    const brandedWebChat = {
      removeNovuBranding: false,
      agentIdentifier: 'my-agent',
      platform: AgentPlatformEnum.WEB_CHAT,
    };

    const postable = (gateway as any).buildAdapterPostableMessage({ markdown: 'Hello **world**' }, brandedWebChat);

    expect(postable).to.deep.equal({ markdown: 'Hello **world**', files: undefined });
    expect(postable.markdown).to.not.include('Powered by');
  });

  it('still brands other platforms when the org has not removed branding', () => {
    const gateway = makeGateway();

    for (const platform of [AgentPlatformEnum.TEAMS, AgentPlatformEnum.TELEGRAM, AgentPlatformEnum.WHATSAPP]) {
      const postable = (gateway as any).buildAdapterPostableMessage(
        { markdown: 'Hello **world**' },
        { ...brandedSlack, platform }
      );

      expect(postable.markdown, platform).to.include('Powered by');
    }
  });

  it('falls back to a split card when Slack markdown exceeds the markdown_text limit', () => {
    const gateway = makeGateway();
    const oversized = `x`.repeat(SLACK_MARKDOWN_TEXT_LIMIT + 1);

    const postable = (gateway as any).buildAdapterPostableMessage({ markdown: oversized }, brandedSlack);

    expect(postable.markdown).to.equal(undefined);
    expect(postable.card).to.be.an('object');
    expect(postable.card.type).to.equal('card');
    expect(postable.card.children.length).to.be.greaterThan(1);
    expect(postable.card.children.every((child: { type: string }) => child.type === 'text')).to.equal(true);
    expect(
      postable.card.children.every((child: { content: string }) => child.content.length <= 3000)
    ).to.equal(true);
  });
});
