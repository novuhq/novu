import { expect } from 'chai';
import { AgentPlatformEnum } from '../agents/shared/enums/agent-platform.enum';
import {
  buildConnectClaimUrl,
  buildKeylessSignupCard,
  buildKeylessWelcomeCard,
  getKeylessWelcomeText,
  isKeylessOrganization,
} from './keyless-signup.helpers';

describe('keyless-signup.helpers', () => {
  const originalKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;

  afterEach(() => {
    if (originalKeylessOrgId === undefined) {
      delete process.env.KEYLESS_ORGANIZATION_ID;
    } else {
      process.env.KEYLESS_ORGANIZATION_ID = originalKeylessOrgId;
    }
  });

  it('isKeylessOrganization returns true only for the configured org', () => {
    process.env.KEYLESS_ORGANIZATION_ID = 'org-keyless';

    expect(isKeylessOrganization('org-keyless')).to.equal(true);
    expect(isKeylessOrganization('org-other')).to.equal(false);
  });

  it('buildConnectClaimUrl encodes the token in the claim URL', () => {
    const claimUrl = buildConnectClaimUrl('abc+token');

    expect(claimUrl).to.include('/connect/claim?token=abc%2Btoken');
    expect(claimUrl.startsWith('http://') || claimUrl.startsWith('https://')).to.equal(true);
  });

  it('buildKeylessWelcomeCard includes welcome text and a subtle signup link', () => {
    const welcomeText = getKeylessWelcomeText(AgentPlatformEnum.SLACK);
    const card = buildKeylessWelcomeCard(welcomeText, 'https://example.com/claim');

    expect(card.children?.[0]).to.deep.equal({ type: 'text', content: welcomeText });
    expect(card.children?.[2]).to.deep.equal({
      type: 'link',
      label: 'Sign up free',
      url: 'https://example.com/claim',
    });
  });

  it('buildKeylessSignupCard includes a primary signup button', () => {
    const card = buildKeylessSignupCard('https://example.com/claim');
    const actions = card.children?.find((child) => child.type === 'actions');

    expect(actions?.children?.[0]).to.deep.equal({
      type: 'link-button',
      label: 'Sign up & keep this agent',
      url: 'https://example.com/claim',
      style: 'primary',
    });
  });
});
