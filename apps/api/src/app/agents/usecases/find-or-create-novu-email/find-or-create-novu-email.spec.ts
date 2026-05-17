import type { AgentEntity, IntegrationEntity } from '@novu/dal';
import { ApiServiceLevelEnum, ChannelTypeEnum, EmailProviderIdEnum, NOVU_PROVIDERS } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import { FindOrCreateNovuEmail } from './find-or-create-novu-email.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-id';

function makeAgent(overrides: Partial<AgentEntity> = {}): AgentEntity {
  return {
    _id: AGENT_ID,
    name: 'My Agent',
    identifier: 'my-agent',
    description: '',
    behavior: undefined,
    active: true,
    _environmentId: ENV_ID,
    _organizationId: ORG_ID,
    ...overrides,
  } as AgentEntity;
}

describe('FindOrCreateNovuEmail usecase', () => {
  let integrationRepo: {
    find: sinon.SinonStub;
    findOne: sinon.SinonStub;
    create: sinon.SinonStub;
  };
  let agentIntegrationRepo: {
    find: sinon.SinonStub;
    findOne: sinon.SinonStub;
    create: sinon.SinonStub;
    withTransaction: sinon.SinonStub;
  };
  let organizationRepo: {
    findById: sinon.SinonStub;
  };
  let agentRepo: {
    findOne: sinon.SinonStub;
  };

  let savedNovuEnterprise: string | undefined;
  let savedSelfHosted: string | undefined;
  let savedSharedDomain: string | undefined;

  function buildUsecase() {
    return new FindOrCreateNovuEmail(
      integrationRepo as any,
      agentIntegrationRepo as any,
      organizationRepo as any,
      agentRepo as any
    );
  }

  beforeEach(() => {
    savedNovuEnterprise = process.env.NOVU_ENTERPRISE;
    savedSelfHosted = process.env.IS_SELF_HOSTED;
    savedSharedDomain = process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;

    process.env.NOVU_ENTERPRISE = 'true';
    delete process.env.IS_SELF_HOSTED;
    process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = 'agentconnect.sh';

    integrationRepo = {
      find: stub().resolves([]),
      findOne: stub(),
      create: stub(),
    };
    agentIntegrationRepo = {
      find: stub().resolves([]),
      findOne: stub().resolves(null),
      create: stub().resolves({
        _id: 'link-id',
        _agentId: AGENT_ID,
        _integrationId: 'novu-agent-int-id',
        _environmentId: ENV_ID,
        _organizationId: ORG_ID,
        connectedAt: null,
      }),
      withTransaction: stub().callsFake(async (fn: (session: null) => Promise<unknown>) => fn(null)),
    };
    organizationRepo = {
      findById: stub().resolves({ apiServiceLevel: ApiServiceLevelEnum.BUSINESS }),
    };
    agentRepo = {
      findOne: stub().resolves(makeAgent()),
    };
  });

  afterEach(() => {
    if (savedNovuEnterprise === undefined) delete process.env.NOVU_ENTERPRISE;
    else process.env.NOVU_ENTERPRISE = savedNovuEnterprise;

    if (savedSelfHosted === undefined) delete process.env.IS_SELF_HOSTED;
    else process.env.IS_SELF_HOSTED = savedSelfHosted;

    if (savedSharedDomain === undefined) delete process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN;
    else process.env.NOVU_AGENT_SHARED_INBOUND_DOMAIN = savedSharedDomain;

    restore();
  });

  describe('outbound integration default', () => {
    it("uses the env's active primary custom email integration as the default outboundIntegrationId on first provision", async () => {
      const primaryCustomIntegration = {
        _id: 'sendgrid-id',
        providerId: 'sendgrid',
        channel: ChannelTypeEnum.EMAIL,
        active: true,
        primary: true,
      } as IntegrationEntity;

      // First findOne: lookup of the primary custom email integration.
      integrationRepo.findOne.onFirstCall().resolves(primaryCustomIntegration);
      // Second findOne: NovuAgent integration creation succeeds.
      integrationRepo.create.resolves({
        _id: 'novu-agent-int-id',
        providerId: EmailProviderIdEnum.NovuAgent,
        channel: ChannelTypeEnum.EMAIL,
        identifier: 'novu-email-xxx',
        name: 'Novu Email',
        active: true,
        credentials: {},
      });

      await buildUsecase().execute(AGENT_ID, ENV_ID, ORG_ID);

      const lookupQuery = integrationRepo.findOne.firstCall.args[0];
      expect(lookupQuery._environmentId).to.equal(ENV_ID);
      expect(lookupQuery._organizationId).to.equal(ORG_ID);
      expect(lookupQuery.channel).to.equal(ChannelTypeEnum.EMAIL);
      expect(lookupQuery.active).to.equal(true);
      expect(lookupQuery.primary).to.equal(true);
      expect(lookupQuery.providerId).to.deep.equal({ $nin: NOVU_PROVIDERS });

      expect(integrationRepo.create.calledOnce).to.equal(true);
      const createArg = integrationRepo.create.firstCall.args[0];
      expect(createArg.providerId).to.equal(EmailProviderIdEnum.NovuAgent);
      expect(createArg.credentials.outboundIntegrationId).to.equal('sendgrid-id');
      expect(createArg.credentials.emailSlugPrefix).to.be.a('string');
      expect(createArg.credentials.inboxRoutingKey).to.be.a('string');
    });

    it('omits outboundIntegrationId when no active primary custom email integration exists, falling back to the demo sender at send-time', async () => {
      integrationRepo.findOne.onFirstCall().resolves(null);
      integrationRepo.create.resolves({
        _id: 'novu-agent-int-id',
        providerId: EmailProviderIdEnum.NovuAgent,
        channel: ChannelTypeEnum.EMAIL,
        identifier: 'novu-email-xxx',
        name: 'Novu Email',
        active: true,
        credentials: {},
      });

      await buildUsecase().execute(AGENT_ID, ENV_ID, ORG_ID);

      const createArg = integrationRepo.create.firstCall.args[0];
      expect(createArg.credentials).to.not.have.property('outboundIntegrationId');
    });

    it('does not lookup or change outboundIntegrationId when an existing NovuAgent link is returned', async () => {
      const existingLink = {
        _id: 'link-id',
        _agentId: AGENT_ID,
        _integrationId: 'existing-novu-agent-int-id',
        _environmentId: ENV_ID,
        _organizationId: ORG_ID,
        connectedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const existingNovuAgentIntegration = {
        _id: 'existing-novu-agent-int-id',
        providerId: EmailProviderIdEnum.NovuAgent,
        channel: ChannelTypeEnum.EMAIL,
        identifier: 'novu-email-existing',
        name: 'Novu Email',
        active: true,
        credentials: {
          emailSlugPrefix: 'my-agent',
          inboxRoutingKey: 'abcd1234',
        },
      };
      agentIntegrationRepo.find.resolves([existingLink]);
      // Lookup of the NovuAgent integration linked to the agent (in findExistingLink).
      integrationRepo.findOne.onFirstCall().resolves(existingNovuAgentIntegration);

      const result = await buildUsecase().execute(AGENT_ID, ENV_ID, ORG_ID);

      expect(result.provisionedNewLink).to.equal(false);
      expect(integrationRepo.create.called).to.equal(false);
      // Only the existing-link lookup happens; we never query for the primary custom integration.
      expect(integrationRepo.findOne.calledOnce).to.equal(true);
    });
  });
});
