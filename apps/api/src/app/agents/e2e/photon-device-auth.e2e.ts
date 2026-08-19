/**
 * Exercises the Photon device-code connect flow end to end against the
 * in-process Photon API stub: start returns a user code + verification URL,
 * a pending poll stays pending, and a successful poll provisions a project,
 * stores the encrypted credentials on the integration, and registers the
 * inbound webhook (storing the Photon-issued signing secret).
 */
import { decryptCredentials, encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { type PhotonApiStub, startPhotonApiStub } from './helpers/photon-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();

describe('Photon device-auth connect flow #novu-v2', () => {
  let session: UserSession;
  let agentIdentifier: string;
  let integrationIdentifier: string;
  let photonApiStub: PhotonApiStub;

  before(async () => {
    (process.env as Record<string, string>).IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    photonApiStub = await startPhotonApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-photon-da-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Photon Device Auth Agent',
      identifier: agentIdentifier,
    });
    const agentId = createRes.body.data._id as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.PhotonImessage,
      channel: ChannelTypeEnum.CHAT,
      // Connect starts from an integration with empty credentials.
      credentials: encryptCredentials({}),
      active: true,
      name: 'Photon Device Auth Integration',
      identifier: `photon-da-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  });

  afterEach(() => {
    photonApiStub.reset();
  });

  const baseUrl = () => `/v1/agents/${agentIdentifier}/integrations/${integrationIdentifier}/photon/device-auth`;

  it('starts the device flow and returns a user code + verification URL', async () => {
    const res = await session.testAgent.post(`${baseUrl()}/start`).send({});

    expect(res.status).to.equal(200);
    expect(res.body.data.available).to.equal(true);
    expect(res.body.data.userCode).to.equal('STUB-CODE');
    expect(res.body.data.deviceCode).to.equal('stub-device-code');
    expect(res.body.data.verificationUri).to.contain('/sign-in/device');
    // Relative verification URIs are absolutized against the Photon host.
    expect(res.body.data.verificationUri).to.match(/^http/);

    const codeCall = photonApiStub.calls.find((call) => call.path === '/api/auth/device/code');
    expect(codeCall?.payload.client_id).to.be.a('string');
  });

  it('reports pending while the user has not approved yet', async () => {
    const res = await session.testAgent.post(`${baseUrl()}/poll`).send({ deviceCode: 'pending-device-code' });

    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('pending');
  });

  it('reports denied when the user rejects the request', async () => {
    const res = await session.testAgent.post(`${baseUrl()}/poll`).send({ deviceCode: 'denied-device-code' });

    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('denied');
  });

  it('provisions the project, stores credentials, and registers the webhook on approval', async () => {
    const res = await session.testAgent.post(`${baseUrl()}/poll`).send({ deviceCode: 'stub-device-code' });

    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('complete');
    expect(res.body.data.projectId).to.equal('stub-project-id');

    // Project created + secret read with the Bearer token, never exposed in the response.
    const createCall = photonApiStub.calls.find((call) => call.method === 'POST' && call.path === '/api/projects');
    expect(createCall?.headers.authorization).to.equal('Bearer stub-access-token');
    expect(createCall?.payload.platforms).to.deep.equal(['imessage']);
    expect(JSON.stringify(res.body)).to.not.contain('stub-project-secret');
    expect(JSON.stringify(res.body)).to.not.contain('stub-access-token');

    // Platform enabled + webhook registered against spectrum with the new project credentials.
    const platformCall = photonApiStub.calls.find((call) => call.path === '/projects/stub-project-id/platforms');
    expect(platformCall?.payload).to.deep.equal({ platform: 'imessage', enabled: true });
    const webhookCall = photonApiStub.calls.find(
      (call) => call.method === 'POST' && call.path === '/projects/stub-project-id/webhooks'
    );
    expect(webhookCall?.payload.schemaVersion).to.equal('normalized-events.v1');

    // Credentials persisted (encrypted at rest, decryptable to the stub values).
    const integration = await integrationRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: integrationIdentifier,
    });
    const credentials = decryptCredentials(integration?.credentials ?? {});
    expect(credentials.apiKey).to.equal('stub-project-id');
    expect(credentials.secretKey).to.equal('stub-project-secret');
    expect(credentials.token).to.match(/^whsec_/);
  });
});
