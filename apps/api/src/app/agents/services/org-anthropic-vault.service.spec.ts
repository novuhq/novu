import { expect } from 'chai';
import sinon from 'sinon';
import { OrgAnthropicVaultService } from './org-anthropic-vault.service';

const ORG_ID = 'org-id';
const ENV_ID = 'env-id';
const USER_ID = 'user-id';
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

function makeRepo(initial?: { _id: string; values: Array<{ _environmentId: string; value: string }> }) {
  return {
    findOne: sinon.stub().resolves(initial),
    create: sinon.stub().resolves(),
    updateOne: sinon.stub().resolves({ matched: 1, modified: 1 }),
  };
}

function makeValidator() {
  return {
    validateEnvironmentVariablesLimit: sinon.stub().resolves(),
  };
}

async function* asyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

function buildService(overrides: {
  repo?: ReturnType<typeof makeRepo>;
  validator?: ReturnType<typeof makeValidator>;
  logger?: ReturnType<typeof makeLogger>;
  sdkStubs?: {
    vaults?: {
      create?: sinon.SinonStub;
      credentials?: {
        list?: sinon.SinonStub;
        create?: sinon.SinonStub;
        archive?: sinon.SinonStub;
      };
    };
  };
}) {
  const repo = overrides.repo ?? makeRepo();
  const validator = overrides.validator ?? makeValidator();
  const logger = overrides.logger ?? makeLogger();

  const service = new OrgAnthropicVaultService(repo as any, validator as any, logger as any);

  const vaultsCreate = overrides.sdkStubs?.vaults?.create ?? sinon.stub().resolves({ id: 'vlt_1' });
  const credentialsList = overrides.sdkStubs?.vaults?.credentials?.list ?? sinon.stub().returns(asyncIterable([]));
  const credentialsCreate = overrides.sdkStubs?.vaults?.credentials?.create ?? sinon.stub().resolves({ id: 'vcrd_1' });
  const credentialsArchive = overrides.sdkStubs?.vaults?.credentials?.archive ?? sinon.stub().resolves({});

  sinon.stub(service as any, 'buildClient').callsFake(() => ({
    beta: {
      vaults: {
        create: vaultsCreate,
        credentials: { list: credentialsList, create: credentialsCreate, archive: credentialsArchive },
      },
    },
  }));

  return { service, repo, vaultsCreate, credentialsList, credentialsCreate, credentialsArchive };
}

describe('OrgAnthropicVaultService', () => {
  afterEach(() => sinon.restore());

  describe('ensureVault', () => {
    it('returns the cached id without contacting Anthropic when one exists', async () => {
      const repo = makeRepo({
        _id: 'envvar1',
        values: [{ _environmentId: ENV_ID, value: 'vlt_existing' }],
      });
      const { service, vaultsCreate } = buildService({ repo });

      const result = await service.ensureVault({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        userId: USER_ID,
        apiKey: API_KEY,
      });

      expect(result).to.equal('vlt_existing');
      expect(vaultsCreate.called).to.equal(false);
    });

    it('creates an Anthropic vault and persists the id when missing', async () => {
      const { service, vaultsCreate, repo } = buildService({});

      const result = await service.ensureVault({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        userId: USER_ID,
        apiKey: API_KEY,
      });

      expect(result).to.equal('vlt_1');
      expect(vaultsCreate.calledOnce).to.equal(true);
      expect(repo.create.calledOnce).to.equal(true);
      const persistedValues = repo.create.firstCall.args[0].values;
      expect(persistedValues[0].value).to.equal('vlt_1');
    });
  });

  describe('setStaticBearer', () => {
    it('archives any prior credentials for the same URL and creates a new one', async () => {
      const repo = makeRepo({
        _id: 'envvar1',
        values: [{ _environmentId: ENV_ID, value: 'vlt_existing' }],
      });
      const credentialsList = sinon.stub().returns(
        asyncIterable([
          { id: 'vcrd_old', archived_at: null, auth: { mcp_server_url: 'https://mcp.example/v1/sse' } },
          { id: 'vcrd_other', archived_at: null, auth: { mcp_server_url: 'https://other.example/sse' } },
        ])
      );
      const sdkStubs = { vaults: { credentials: { list: credentialsList } } };
      const { service, credentialsCreate, credentialsArchive } = buildService({ repo, sdkStubs });

      const result = await service.setStaticBearer({
        organizationId: ORG_ID,
        environmentId: ENV_ID,
        userId: USER_ID,
        apiKey: API_KEY,
        mcpServerUrl: 'https://mcp.example/v1/sse',
        token: 'super-secret',
      });

      expect(credentialsArchive.calledOnce).to.equal(true);
      expect(credentialsArchive.firstCall.args[0]).to.equal('vcrd_old');
      expect(credentialsCreate.calledOnce).to.equal(true);
      const [vaultIdArg, body] = credentialsCreate.firstCall.args;
      expect(vaultIdArg).to.equal('vlt_existing');
      expect(body.auth).to.deep.equal({
        type: 'static_bearer',
        token: 'super-secret',
        mcp_server_url: 'https://mcp.example/v1/sse',
      });
      expect(result.credentialId).to.equal('vcrd_1');
    });
  });
});
