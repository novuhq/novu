import { expect } from 'chai';
import { AgentPlatformEnum } from '../agents/shared/enums/agent-platform.enum';
import { getWelcomeText } from '../agents/shared/util/agent-welcome-text';
import {
  buildConnectClaimUrl,
  buildHumanClaimUrl,
  buildKeylessSignupCard,
  buildKeylessWelcomeCard,
  resolveConnectClaimBaseUrl,
} from './keyless-signup.helpers';

describe('keyless-signup.helpers', () => {
  const originalEnv = {
    DASHBOARD_URL: process.env.DASHBOARD_URL,
    FRONT_BASE_URL: process.env.FRONT_BASE_URL,
    HUMAN_WEBSITE_URL: process.env.HUMAN_WEBSITE_URL,
    NOVU_REGION: process.env.NOVU_REGION,
  };

  afterEach(() => {
    for (const [name, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
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

  it('buildConnectClaimUrl preserves autolink-safe alphanumeric tokens', () => {
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';
    delete process.env.FRONT_BASE_URL;

    const token = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

    expect(buildConnectClaimUrl(token)).to.equal(`https://dashboard.example.com/connect/claim?token=${token}`);
  });

  it('buildHumanClaimUrl points at the Human website when it is configured', () => {
    process.env.HUMAN_WEBSITE_URL = 'https://www.gethuman.md/';
    process.env.NOVU_REGION = 'us-east-1';

    expect(buildHumanClaimUrl('abc')).to.equal('https://www.gethuman.md/claim?token=abc');
  });

  it('buildHumanClaimUrl adds the region on EU deployments', () => {
    process.env.HUMAN_WEBSITE_URL = 'https://www.gethuman.md';
    process.env.NOVU_REGION = 'eu-central-1';

    expect(buildHumanClaimUrl('abc')).to.equal('https://www.gethuman.md/claim?token=abc&region=eu');
  });

  it('buildHumanClaimUrl falls back to the dashboard claim page without a Human website', () => {
    delete process.env.HUMAN_WEBSITE_URL;
    process.env.DASHBOARD_URL = 'https://dashboard.example.com';

    expect(buildHumanClaimUrl('abc')).to.equal('https://dashboard.example.com/connect/claim?token=abc');
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
