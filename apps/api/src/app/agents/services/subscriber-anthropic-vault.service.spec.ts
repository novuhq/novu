import { expect } from 'chai';
import sinon from 'sinon';
import { SubscriberAnthropicVaultService } from './subscriber-anthropic-vault.service';

const ORG_ID = 'org-id';
const ENV_ID = 'env-id';
const SUBSCRIBER_ID = 'sub-id';
const AGENT_ID = 'agent-id';
const API_KEY = 'sk-ant-test';

function makeLogger() {
  return {
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    info: sinon.stub(),
    setContext: sinon.stub(),
  };
}

function makeRepo() {
  return {
    findForSubscriberAgent: sinon.stub().resolves(null),
    upsertVault: sinon.stub(),
    upsertConnection: sinon.stub().resolves(),
    removeConnection: sinon.stub().resolves(),
    markConnectionStatus: sinon.stub().resolves(),
    findAllForAgent: sinon.stub().resolves([]),
    findAllForSubscriber: sinon.stub().resolves([]),
    deleteOne: sinon.stub().resolves(),
  };
}

async function* asyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

function buildService(overrides: {
  repo?: ReturnType<typeof makeRepo>;
  logger?: ReturnType<typeof makeLogger>;
  sdkStubs?: {
    vaults?: {
      create?: sinon.SinonStub;
      archive?: sinon.SinonStub;
      credentials?: {
        list?: sinon.SinonStub;
        create?: sinon.SinonStub;
        archive?: sinon.SinonStub;
      };
    };
  };
}) {
  const repo = overrides.repo ?? makeRepo();
  const logger = overrides.logger ?? makeLogger();
  const service = new SubscriberAnthropicVaultService(repo as any, logger as any);

  const vaultsCreate = overrides.sdkStubs?.vaults?.create ?? sinon.stub().resolves({ id: 'vlt_new' });
  const vaultsArchive = overrides.sdkStubs?.vaults?.archive ?? sinon.stub().resolves({});
  const credentialsList = overrides.sdkStubs?.vaults?.credentials?.list ?? sinon.stub().returns(asyncIterable([]));
  const credentialsCreate =
    overrides.sdkStubs?.vaults?.credentials?.create ?? sinon.stub().resolves({ id: 'vcrd_new' });
  const credentialsArchive = overrides.sdkStubs?.vaults?.credentials?.archive ?? sinon.stub().resolves({});

  sinon.stub(service as any, 'buildClient').callsFake(() => ({
    beta: {
      vaults: {
        create: vaultsCreate,
        archive: vaultsArchive,
        credentials: { list: credentialsList, create: credentialsCreate, archive: credentialsArchive },
      },
    },
  }));

  return { service, repo, vaultsCreate, vaultsArchive, credentialsList, credentialsCreate, credentialsArchive };
}

describe('SubscriberAnthropicVaultService', () => {
  afterEach(() => sinon.restore());

  describe('ensureVault', () => {
    it('returns the existing vault when one exists', async () => {
      const repo = makeRepo();
      repo.findForSubscriberAgent.resolves({ _id: 'vault-id', anthropicVaultId: 'vlt_existing', connections: [] });
      const { service, vaultsCreate } = buildService({ repo });

      const result = await service.ensureVault({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        subscriberId: SUBSCRIBER_ID,
        agentId: AGENT_ID,
        apiKey: API_KEY,
      });

      expect(result.anthropicVaultId).to.equal('vlt_existing');
      expect(vaultsCreate.called).to.equal(false);
    });

    it('creates a new Anthropic vault when none exists', async () => {
      const repo = makeRepo();
      repo.upsertVault.resolves({
        doc: { _id: 'vault-id', anthropicVaultId: 'vlt_new', connections: [] },
        wasCreated: true,
      });
      const { service, vaultsCreate, vaultsArchive } = buildService({ repo });

      const result = await service.ensureVault({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        subscriberId: SUBSCRIBER_ID,
        agentId: AGENT_ID,
        apiKey: API_KEY,
      });

      expect(vaultsCreate.calledOnce).to.equal(true);
      expect(result.anthropicVaultId).to.equal('vlt_new');
      expect(vaultsArchive.called).to.equal(false);
    });

    it('archives the duplicate vault when another writer wins the race', async () => {
      const repo = makeRepo();
      repo.upsertVault.resolves({
        doc: { _id: 'vault-id', anthropicVaultId: 'vlt_winner', connections: [] },
        wasCreated: false,
      });
      const { service, vaultsArchive } = buildService({ repo });

      const result = await service.ensureVault({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        subscriberId: SUBSCRIBER_ID,
        agentId: AGENT_ID,
        apiKey: API_KEY,
      });

      expect(result.anthropicVaultId).to.equal('vlt_winner');
      expect(vaultsArchive.calledOnceWith('vlt_new')).to.equal(true);
    });
  });

  describe('setOAuthCredential', () => {
    it('archives prior credentials for the same URL, creates a new one, and persists the connection', async () => {
      const repo = makeRepo();
      repo.findForSubscriberAgent.resolves({ _id: 'vault-id', anthropicVaultId: 'vlt_existing', connections: [] });
      const credentialsList = sinon
        .stub()
        .returns(
          asyncIterable([{ id: 'vcrd_old', archived_at: null, auth: { mcp_server_url: 'https://github.example/mcp' } }])
        );
      const sdkStubs = { vaults: { credentials: { list: credentialsList } } };
      const { service, credentialsCreate, credentialsArchive } = buildService({ repo, sdkStubs });

      await service.setOAuthCredential({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        subscriberId: SUBSCRIBER_ID,
        agentId: AGENT_ID,
        apiKey: API_KEY,
        mcpServerName: 'github',
        mcpServerUrl: 'https://github.example/mcp',
        accessToken: 'token-1',
        refresh: {
          clientId: 'cid',
          refreshToken: 'rtoken',
          tokenEndpoint: 'https://example/oauth/token',
          tokenEndpointAuth: { type: 'client_secret_post', clientSecret: 'secret' },
          scope: 'repo',
        },
      });

      expect(credentialsArchive.calledOnceWith('vcrd_old', { vault_id: 'vlt_existing' })).to.equal(true);
      expect(credentialsCreate.calledOnce).to.equal(true);
      const [vaultIdArg, body] = credentialsCreate.firstCall.args;
      expect(vaultIdArg).to.equal('vlt_existing');
      expect(body.auth.type).to.equal('mcp_oauth');
      expect(body.auth.access_token).to.equal('token-1');
      expect(body.auth.refresh.client_id).to.equal('cid');
      expect(body.auth.refresh.token_endpoint_auth).to.deep.equal({
        type: 'client_secret_post',
        client_secret: 'secret',
      });
      expect(repo.upsertConnection.calledOnce).to.equal(true);
      const upsertArgs = repo.upsertConnection.firstCall.args[0];
      expect(upsertArgs.vaultId).to.equal('vault-id');
      expect(upsertArgs.connection.mcpServerName).to.equal('github');
      expect(upsertArgs.connection.credentialId).to.equal('vcrd_new');
      expect(upsertArgs.connection.status).to.equal('connected');
    });
  });
});
