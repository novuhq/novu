import { CacheService, PinoLogger } from '@novu/application-generic';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEmailActionClaims, AgentEmailActionTokenService } from './agent-email-action-token.service';

const claims: AgentEmailActionClaims = {
  agentId: 'agent-1',
  agentIdentifier: 'inbox',
  agentName: 'Ada',
  integrationIdentifier: 'email',
  environmentId: 'env-1',
  organizationId: 'org-1',
  threadId: 'thread-1',
  messageId: '<msg@example.com>',
  actionId: 'approve',
  userIdentifier: 'ada@example.com',
};

describe('AgentEmailActionTokenService action URLs', () => {
  const original = {
    API_ROOT_URL: process.env.API_ROOT_URL,
    HUMAN_DASHBOARD_URL: process.env.HUMAN_DASHBOARD_URL,
  };

  afterEach(() => {
    sinon.restore();
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  async function mintedPageUrl(overrides: Partial<AgentEmailActionClaims> = {}): Promise<string> {
    const cacheService = sinon.createStubInstance(CacheService);
    cacheService.set.resolves();
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new AgentEmailActionTokenService(
      cacheService as unknown as CacheService,
      logger as unknown as PinoLogger
    );
    const { url } = await service.signActionToken({ ...claims, ...overrides });

    return url.split('?')[0] ?? url;
  }

  const agentInbox = { agentInbox: { question: 'Deploy?' } };

  it('keeps the links of a Novu agent on the API, even where the Agent Inbox site runs', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co';
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md/';

    expect(await mintedPageUrl()).to.equal('https://api.novu.co/v1/agents/email/actions/preview');
  });

  it('serves the links of an Agent Inbox agent from the Agent Inbox site', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co';
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md/';

    expect(await mintedPageUrl(agentInbox)).to.equal('https://www.agentinbox.md/email-action');
  });

  it('follows the Agent Inbox site of any environment, such as staging', async () => {
    process.env.API_ROOT_URL = 'https://api.novu-staging.co';
    process.env.HUMAN_DASHBOARD_URL = 'https://staging.agentinbox.md';

    expect(await mintedPageUrl(agentInbox)).to.equal('https://staging.agentinbox.md/email-action');
  });

  it('keeps an Agent Inbox link on the API when there is no site', async () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    delete process.env.HUMAN_DASHBOARD_URL;

    expect(await mintedPageUrl(agentInbox)).to.equal('https://api.example.com/v1/human/email-actions');
  });

  it('refuses a plaintext Agent Inbox URL on a public host', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co';
    process.env.HUMAN_DASHBOARD_URL = 'http://agentinbox.example';

    try {
      await mintedPageUrl(agentInbox);
      expect.fail('expected plaintext dashboard URL to be rejected');
    } catch (error) {
      expect((error as Error).message).to.contain('HUMAN_DASHBOARD_URL must use https://');
    }
  });

  it('allows a loopback Agent Inbox URL over HTTP', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co';
    process.env.HUMAN_DASHBOARD_URL = 'http://127.0.0.1:4173';

    expect(await mintedPageUrl(agentInbox)).to.equal('http://127.0.0.1:4173/email-action');
  });
});
