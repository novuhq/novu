import { expect } from 'chai';
import sinon from 'sinon';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { buildConnectCardDelivery } from './connect-card.builder';

describe('buildConnectCardDelivery', () => {
  it('shortens the authorize URL on WhatsApp before building the card', async () => {
    const connectRedirect = {
      issue: sinon.stub().resolves('https://api.example.com/v1/agents/mcp/r/short-token'),
    };

    const delivery = await buildConnectCardDelivery(
      {
        platform: AgentPlatformEnum.WHATSAPP,
        mcpId: 'attio',
        mcpName: 'Attio',
        authorizeUrl: 'https://app.attio.com/oidc/authorize?state=very-long',
      },
      { connectRedirect }
    );

    expect(connectRedirect.issue.calledOnceWithExactly('https://app.attio.com/oidc/authorize?state=very-long')).to.equal(
      true
    );
    expect((delivery.content.card as { children: Array<{ children: Array<{ url?: string }> }> }).children[1].children[0]
      .url).to.equal('https://api.example.com/v1/agents/mcp/r/short-token');
  });

  it('keeps the authorize URL unchanged on Slack', async () => {
    const connectRedirect = {
      issue: sinon.stub(),
    };
    const authorizeUrl = 'https://provider.example/oauth/authorize?state=abc';

    const delivery = await buildConnectCardDelivery(
      {
        platform: AgentPlatformEnum.SLACK,
        mcpId: 'attio',
        mcpName: 'Attio',
        authorizeUrl,
      },
      { connectRedirect }
    );

    expect(connectRedirect.issue.called).to.equal(false);
    expect((delivery.content.card as { children: Array<{ children: Array<{ url?: string }> }> }).children[1].children[0]
      .url).to.equal(authorizeUrl);
    expect(delivery.slackNative).to.not.equal(undefined);
  });
});
