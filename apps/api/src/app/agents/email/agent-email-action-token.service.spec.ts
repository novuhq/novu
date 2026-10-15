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

  async function mintedPageUrl(): Promise<string> {
    const cacheService = sinon.createStubInstance(CacheService);
    cacheService.set.resolves();
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new AgentEmailActionTokenService(
      cacheService as unknown as CacheService,
      logger as unknown as PinoLogger
    );
    const { url } = await service.signActionToken(claims);

    return url.split('?')[0] ?? url;
  }

  it('serves US cloud action links from the Agent Inbox site', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co';
    delete process.env.HUMAN_DASHBOARD_URL;

    expect(await mintedPageUrl()).to.equal('https://agentinbox.md/v1/agents/email/actions/preview');
  });

  it('uses HUMAN_DASHBOARD_URL when the US API has one configured', async () => {
    process.env.API_ROOT_URL = 'https://api.novu.co/';
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md/';

    expect(await mintedPageUrl()).to.equal('https://www.agentinbox.md/v1/agents/email/actions/preview');
  });

  it('keeps EU action links on the EU API', async () => {
    process.env.API_ROOT_URL = 'https://eu.api.novu.co';
    delete process.env.HUMAN_DASHBOARD_URL;

    expect(await mintedPageUrl()).to.equal('https://eu.api.novu.co/v1/agents/email/actions/preview');
  });

  it('keeps self-hosted action links on the API', async () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    process.env.HUMAN_DASHBOARD_URL = 'https://agentinbox.md';

    expect(await mintedPageUrl()).to.equal('https://api.example.com/v1/agents/email/actions/preview');
  });
});
