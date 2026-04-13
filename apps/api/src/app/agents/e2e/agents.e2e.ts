import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Agents API - /agents #novu-v2', () => {
  let session: UserSession;
  const agentRepository = new AgentRepository();
  const agentIntegrationRepository = new AgentIntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create, list, get, patch, and delete an agent', async () => {
    const identifier = `e2e-agent-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'E2E Agent',
      identifier,
      description: 'e2e description',
    });

    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.name).to.equal('E2E Agent');
    expect(createRes.body.data.identifier).to.equal(identifier);
    expect(createRes.body.data.description).to.equal('e2e description');
    expect(createRes.body.data._id).to.be.a('string');

    const listRes = await session.testAgent.get('/v1/agents');

    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array');
    expect(listRes.body).to.have.property('next');
    expect(listRes.body).to.have.property('previous');
    expect(listRes.body).to.have.property('totalCount');
    expect(listRes.body).to.have.property('totalCountCapped');
    expect(listRes.body.data.some((a: { identifier: string }) => a.identifier === identifier)).to.be.true;

    const getRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.identifier).to.equal(identifier);

    const patchRes = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}`).send({
      name: 'E2E Agent Updated',
      description: 'updated',
    });

    expect(patchRes.status).to.equal(200);
    expect(patchRes.body.data.name).to.equal('E2E Agent Updated');
    expect(patchRes.body.data.description).to.equal('updated');

    const deleteRes = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(deleteRes.status).to.equal(204);

    const afterDelete = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}`);

    expect(afterDelete.status).to.equal(404);
  });

  it('should return 404 when agent identifier does not exist', async () => {
    const res = await session.testAgent.get('/v1/agents/nonexistent-agent-id-xyz');

    expect(res.status).to.equal(404);
  });

  it('should return 400 when both before and after cursors are provided on list agents', async () => {
    const response = await session.testAgent
      .get('/v1/agents')
      .query({ before: '000000000000000000000001', after: '000000000000000000000002' });

    expect(response.status).to.equal(400);
    expect(response.body.message).to.contain('Cannot specify both "before" and "after" cursors');
  });

  it('should return 409 when creating a duplicate agent identifier in the same environment', async () => {
    const identifier = `e2e-dup-${Date.now()}`;

    await session.testAgent.post('/v1/agents').send({
      name: 'First',
      identifier,
    });

    const second = await session.testAgent.post('/v1/agents').send({
      name: 'Second',
      identifier,
    });

    expect(second.status).to.equal(409);
  });

  it('should add, list, update, and remove agent-integration links', async () => {
    const identifier = `e2e-agent-int-${Date.now()}`;

    await session.testAgent.post('/v1/agents').send({
      name: 'Agent With Integrations',
      identifier,
    });

    const integrations = (await session.testAgent.get('/v1/integrations')).body.data as Array<{
      _id: string;
      identifier: string;
      channel: string;
      providerId: string;
    }>;

    const emailIntegration = integrations.find(
      (i) => i.channel === ChannelTypeEnum.EMAIL && i.providerId === EmailProviderIdEnum.SendGrid
    );
    const smsIntegration = integrations.find(
      (i) => i.channel === ChannelTypeEnum.SMS && i.providerId === SmsProviderIdEnum.Twilio
    );

    expect(emailIntegration, 'seeded SendGrid integration').to.exist;
    expect(smsIntegration, 'seeded Twilio integration').to.exist;

    if (!emailIntegration || !smsIntegration) {
      throw new Error('Seeded email/SMS integrations not found');
    }

    const emailIntegrationIdentifier = emailIntegration.identifier;
    const smsIntegrationIdentifier = smsIntegration.identifier;

    const addRes = await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`)
      .send({ integrationIdentifier: emailIntegrationIdentifier });

    expect(addRes.status).to.equal(201);
    expect(addRes.body.data.integrationIdentifier).to.equal(emailIntegrationIdentifier);
    const linkId = addRes.body.data._id as string;

    const listRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/integrations`);

    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array');
    expect(listRes.body).to.have.property('next');
    expect(listRes.body.data.length).to.equal(1);
    expect(listRes.body.data[0]._id).to.equal(linkId);

    const patchLinkRes = await session.testAgent
      .patch(`/v1/agents/${encodeURIComponent(identifier)}/integrations/${linkId}`)
      .send({ integrationIdentifier: smsIntegrationIdentifier });

    expect(patchLinkRes.status).to.equal(200);
    expect(patchLinkRes.body.data.integrationIdentifier).to.equal(smsIntegrationIdentifier);

    const removeRes = await session.testAgent.delete(
      `/v1/agents/${encodeURIComponent(identifier)}/integrations/${linkId}`
    );

    expect(removeRes.status).to.equal(204);

    const listAfterRemove = await session.testAgent.get(
      `/v1/agents/${encodeURIComponent(identifier)}/integrations`
    );

    expect(listAfterRemove.body.data.length).to.equal(0);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);
  });

  it('should delete agent and cascade remove agent-integration links', async () => {
    const identifier = `e2e-cascade-${Date.now()}`;

    const createAgentRes = await session.testAgent.post('/v1/agents').send({
      name: 'Cascade Agent',
      identifier,
    });

    const agentId = createAgentRes.body.data._id as string;

    const integrations = (await session.testAgent.get('/v1/integrations')).body.data as Array<{
      identifier: string;
    }>;
    const integrationIdentifier = integrations[0].identifier;

    await session.testAgent.post(`/v1/agents/${encodeURIComponent(identifier)}/integrations`).send({
      integrationIdentifier,
    });

    const countBefore = await agentIntegrationRepository.count({
      _agentId: agentId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(countBefore).to.equal(1);

    await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`);

    const countAfter = await agentIntegrationRepository.count({
      _agentId: agentId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(countAfter).to.equal(0);

    const agentAfter = await agentRepository.findOne(
      {
        _id: agentId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      ['_id']
    );

    expect(agentAfter).to.equal(null);
  });
});
