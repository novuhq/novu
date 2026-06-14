import { expect } from 'chai';
import { AgentPlatformEnum } from '../agents/shared/enums/agent-platform.enum';
import { getWelcomeText } from '../agents/shared/util/agent-welcome-text';
import {
  buildConnectClaimUrl,
  buildKeylessSignupCard,
  buildKeylessWelcomeCard,
  resolveConnectClaimBaseUrl,
} from './keyless-signup.helpers';

describe('keyless-signup.helpers', () => {
  const originalDashboardUrl = process.env.DASHBOARD_URL;
  const originalFrontBaseUrl = process.env.FRONT_BASE_URL;

  afterEach(() => {
    if (originalDashboardUrl === undefined) {
      delete process.env.DASHBOARD_URL;
    } else {
      process.env.DASHBOARD_URL = originalDashboardUrl;
    }

    if (originalFrontBaseUrl === undefined) {
      delete process.env.FRONT_BASE_URL;
    } else {
      process.env.FRONT_BASE_URL = originalFrontBaseUrl;
    }
  });

  it('resolveConnectClaimBaseUrl prefers DASHBOARD_URL over FRONT_BASE_URL', () => {
    process.env.DASHBOARD_URL = 'https://dashboard.example.com/';
    process.env.FRONT_BASE_URL = 'https://front.example.com';

    expect(resolveConnectClaimBaseUrl()).to.equal('https://dashboard.example.com');
  });

  it('resolveConnectClaimBaseUrl falls back to FRONT_BASE_URL when DASHBOARD_URL is unset', () => {
    delete process.env.DASHBOARD_URL;
    process.env.FRONT_BASE_URL = 'https://front.example.com/';

    expect(resolveConnectClaimBaseUrl()).to.equal('https://front.example.com');
  });

  it('resolveConnectClaimBaseUrl skips regex-shaped env values and uses the default', () => {
    process.env.DASHBOARD_URL = '^https://.*\\.example\\.com$';
    delete process.env.FRONT_BASE_URL;

    expect(resolveConnectClaimBaseUrl()).to.equal('https://dashboard.novu.co');
  });

  it('buildConnectClaimUrl encodes the token in the claim URL', () => {
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';
    delete process.env.FRONT_BASE_URL;

    expect(buildConnectClaimUrl('abc+token')).to.equal('https://dashboard.example.com/connect/claim?token=abc%2Btoken');
  });

  it('buildKeylessWelcomeCard includes welcome text and a primary signup button', () => {
    const welcomeText = getWelcomeText(AgentPlatformEnum.SLACK);
    const card = buildKeylessWelcomeCard(welcomeText, 'https://example.com/claim');
    const actions = card.children?.find((child) => child.type === 'actions');

    expect(card.children?.[0]).to.deep.equal({ type: 'text', content: welcomeText });
    expect(actions?.children?.[0]).to.deep.equal({
      type: 'link-button',
      label: 'Sign up free',
      url: 'https://example.com/claim',
      style: 'primary',
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
