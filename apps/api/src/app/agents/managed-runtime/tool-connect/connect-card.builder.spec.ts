import { expect } from 'chai';
import sinon from 'sinon';

import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { buildConnectCardDelivery } from './connect-card.builder';

describe('buildConnectCardDelivery', () => {
  function getConnectButtonUrl(delivery: Awaited<ReturnType<typeof buildConnectCardDelivery>>): string | undefined {
    const card = delivery.content.card;
    const actions = card?.children?.find((child) => child.type === 'actions');

    return actions?.children?.find((action) => action.type === 'link-button')?.url;
  }

  it('shortens the authorize URL on WhatsApp before building the card', async () => {
    const shortUrl = 'https://api.example.com/v1/agents/mcp/r/short-token';
    const connectRedirect = {
      issue: sinon.stub().resolves(shortUrl),
    };
    const authorizeUrl = 'https://app.attio.com/oidc/authorize?state=very-long';

    const delivery = await buildConnectCardDelivery(
      {
        platform: AgentPlatformEnum.WHATSAPP,
        mcpId: 'attio',
        mcpName: 'Attio',
        authorizeUrl,
      },
      { connectRedirect }
    );

    expect(connectRedirect.issue.calledOnceWithExactly(authorizeUrl)).to.equal(true);
    expect(getConnectButtonUrl(delivery)).to.equal(shortUrl);
  });

  it('keeps the authorize URL unchanged on Slack', async () => {
    const connectRedirect = {
      issue: sinon.stub(),
    };

    const delivery = await buildConnectCardDelivery(
      {
        platform: AgentPlatformEnum.SLACK,
        mcpId: 'attio',
        mcpName: 'Attio',
        authorizeUrl: 'https://provider.example/oauth/authorize?state=abc',
      },
      { connectRedirect }
    );

    expect(connectRedirect.issue.called).to.equal(false);
    expect(delivery.slackNative).to.not.equal(undefined);
  });
});
