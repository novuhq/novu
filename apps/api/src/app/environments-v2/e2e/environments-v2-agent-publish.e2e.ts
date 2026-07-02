import { AgentIntegrationRepository, AgentRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Agent Promotion - /v2/environments/:targetEnvironmentId/publish (POST) #novu-v2', () => {
  let session: UserSession;
  let previousAgentsFlag: string | undefined;

  const environmentRepository = new EnvironmentRepository();
  const agentRepository = new AgentRepository();
  const agentIntegrationRepository = new AgentIntegrationRepository();
  const integrationRepository = new IntegrationRepository();

  before(() => {
    previousAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  after(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = previousAgentsFlag;
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  async function getProductionEnvironment() {
    const prodEnv = await environmentRepository.findOne({
      _parentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    if (!prodEnv) throw new Error('Production environment not found');

    return prodEnv;
  }

  async function publish(prodEnvId: string) {
    return session.testAgent.post(`/v2/environments/${prodEnvId}/publish`).send({}).expect(200);
  }

  async function getDiff(prodEnvId: string) {
    return session.testAgent.post(`/v2/environments/${prodEnvId}/diff`).send({}).expect(200);
  }

  async function getDevIntegration() {
    const integrations = (await session.testAgent.get('/v1/integrations')).body.data as Array<{
      _id: string;
      identifier: string;
      channel: string;
      providerId: string;
    }>;

    const integration = integrations.find(
      (i) => i.channel === ChannelTypeEnum.EMAIL && i.providerId === EmailProviderIdEnum.SendGrid
    );

    if (!integration) throw new Error('Seeded SendGrid integration not found');

    return integration;
  }

  it('should promote agent to prod as inactive with placeholder integrations and connectedAt null', async () => {
    const identifier = `e2e-promote-fresh-${Date.now()}`;
    const prodEnv = await getProductionEnvironment();
    const devIntegration = await getDevIntegration();

    await session.testAgent.post('/v1/agents').send({ name: 'Promote Agent', identifier });
    await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: devIntegration.identifier });

    await publish(prodEnv._id);

    const prodAgent = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      '*'
    );

    expect(prodAgent, 'prod agent should exist').to.exist;
    expect(prodAgent!.active, 'prod agent should start inactive').to.equal(false);

    const prodLinks = await agentIntegrationRepository.find(
      { _agentId: prodAgent!._id, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      '*'
    );

    expect(prodLinks.length, 'one integration link in prod').to.equal(1);
    expect(prodLinks[0].connectedAt, 'link connectedAt should be null').to.equal(null);

    const prodIntegration = await integrationRepository.findOne({
      _id: prodLinks[0]._integrationId,
      _environmentId: prodEnv._id,
      _organizationId: session.organization._id,
    });

    expect(prodIntegration, 'placeholder integration should exist').to.exist;
    expect(prodIntegration!._parentId, 'placeholder should reference dev integration').to.equal(devIntegration._id);
    expect(prodIntegration!.providerId).to.equal(EmailProviderIdEnum.SendGrid);
  });

  it('should include unpromoted agent in diff result as added', async () => {
    const identifier = `e2e-promote-diff-${Date.now()}`;
    const prodEnv = await getProductionEnvironment();

    await session.testAgent.post('/v1/agents').send({ name: 'Diff Agent', identifier });

    const { body } = await getDiff(prodEnv._id);
    const agentDiff = body.data.resources.find(
      (r: { resourceType: string; sourceResource?: { id: string } }) =>
        r.resourceType === 'agent' && r.sourceResource?.id === identifier
    );

    expect(agentDiff, 'agent should appear in diff').to.exist;
    expect(agentDiff.changes[0].action).to.equal('added');
    expect(agentDiff.summary.added).to.equal(1);
  });

  it('should not create duplicate placeholder integrations when promoted twice without changes', async () => {
    const identifier = `e2e-promote-idem-${Date.now()}`;
    const prodEnv = await getProductionEnvironment();
    const devIntegration = await getDevIntegration();

    await session.testAgent.post('/v1/agents').send({ name: 'Idempotent Agent', identifier });
    await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: devIntegration.identifier });

    await publish(prodEnv._id);
    await publish(prodEnv._id);

    const prodAgent = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      ['_id']
    );

    const prodLinks = await agentIntegrationRepository.find(
      { _agentId: prodAgent!._id, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      ['_id']
    );

    expect(prodLinks.length, 'still exactly one link in prod after two publishes').to.equal(1);
  });

  it('should propagate metadata changes without resetting active state', async () => {
    const identifier = `e2e-promote-meta-${Date.now()}`;
    const prodEnv = await getProductionEnvironment();

    await session.testAgent.post('/v1/agents').send({ name: 'Meta Agent', identifier });
    await publish(prodEnv._id);

    await session.switchToProdEnvironment();
    await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({ active: true });
    await session.switchToDevEnvironment();

    await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({ name: 'Meta Agent Updated' });
    await publish(prodEnv._id);

    const prodAgent = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      '*'
    );

    expect(prodAgent!.name).to.equal('Meta Agent Updated');
    expect(prodAgent!.active, 'active state must not be reset by re-promotion').to.equal(true);
  });

  it('should remove agent from prod when it is deleted in dev and re-published', async () => {
    const identifier = `e2e-promote-del-${Date.now()}`;
    const prodEnv = await getProductionEnvironment();

    await session.testAgent.post('/v1/agents').send({ name: 'Delete Agent', identifier });
    await publish(prodEnv._id);

    const afterFirstPublish = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      ['_id']
    );

    expect(afterFirstPublish, 'agent should exist in prod after first publish').to.exist;

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
    await publish(prodEnv._id);

    const afterDelete = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      ['_id']
    );

    expect(afterDelete, 'agent should be gone from prod after dev deletion + re-publish').to.equal(null);
  });

  it('should reject adding and removing integrations in production environment', async () => {
    const identifier = `e2e-prodguard-int-${Date.now()}`;
    const devIntegration = await getDevIntegration();

    await session.testAgent.post('/v1/agents').send({ name: 'Guard Integration Agent', identifier });
    await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: devIntegration.identifier });

    const prodEnv = await getProductionEnvironment();
    await publish(prodEnv._id);

    await session.switchToProdEnvironment();

    const addRes = await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: devIntegration.identifier });

    expect(addRes.status, 'POST integrations should be 403 in prod').to.equal(403);

    const prodAgent = await agentRepository.findOne(
      { identifier, _environmentId: prodEnv._id, _organizationId: session.organization._id },
      ['_id'] as any
    );

    const prodLinks = await agentIntegrationRepository.find(
      {
        _agentId: prodAgent!._id,
        _environmentId: prodEnv._id,
        _organizationId: session.organization._id,
      },
      ['_id']
    );
    const linkId = prodLinks[0]?._id;

    expect(linkId, 'prod agent should have a promoted integration link').to.exist;

    const removeRes = await session.testAgent.delete(
      `/v1/agents/${encodeURIComponent(identifier)}/integrations/${linkId}`
    );

    expect(removeRes.status, 'DELETE integrations should be 403 in prod').to.equal(403);
  });
});
