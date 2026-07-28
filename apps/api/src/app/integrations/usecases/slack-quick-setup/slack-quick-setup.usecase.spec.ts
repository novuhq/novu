import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { SlackQuickSetupCommand } from './slack-quick-setup.command';
import { SlackQuickSetup } from './slack-quick-setup.usecase';

const MOCK_INTEGRATION_ID = '69f84d848bed9b0a73216d96';
const MOCK_AGENT_ID = '69f84d848bed9b0a73216d97';
const MOCK_ENVIRONMENT_ID = '69f84d848bed9b0a73216d98';
const MOCK_ORGANIZATION_ID = '69f84d848bed9b0a73216d99';

function buildHarness() {
  const integrationRepository = {
    findOne: sinon.stub().resolves({
      _id: MOCK_INTEGRATION_ID,
      _environmentId: MOCK_ENVIRONMENT_ID,
      _organizationId: MOCK_ORGANIZATION_ID,
      providerId: ChatProviderIdEnum.Slack,
      identifier: 'slack-integration',
      name: 'My Bot',
    }),
    update: sinon.stub().resolves({}),
  };
  const agentIntegrationRepository = {
    findOne: sinon.stub().resolves(null),
    createOrReviveLink: sinon.stub().resolves({}),
  };
  const logger = { setContext: sinon.stub(), info: sinon.stub() };

  const usecase = new SlackQuickSetup(integrationRepository as any, agentIntegrationRepository as any, logger as any);

  return { usecase, integrationRepository };
}

function buildCommand(overrides: Partial<SlackQuickSetupCommand> = {}): SlackQuickSetupCommand {
  return {
    environmentId: MOCK_ENVIRONMENT_ID,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 'system',
    integrationId: MOCK_INTEGRATION_ID,
    agentId: MOCK_AGENT_ID,
    configToken: 'xoxe.xoxp-1-config-token',
    ...overrides,
  } as SlackQuickSetupCommand;
}

function parseSentManifest(axiosPost: sinon.SinonStub): Record<string, any> {
  const body = axiosPost.firstCall.args[1] as string;
  const manifest = new URLSearchParams(body).get('manifest');

  return JSON.parse(manifest as string);
}

describe('SlackQuickSetup', () => {
  let axiosPost: sinon.SinonStub;

  beforeEach(() => {
    axiosPost = sinon.stub(axios, 'post').resolves({
      data: {
        ok: true,
        app_id: 'A123',
        credentials: {
          client_id: 'client-id',
          client_secret: 'client-secret',
          verification_token: 'verification-token',
          signing_secret: 'signing-secret',
        },
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('always enables token rotation in the manifest', async () => {
    const { usecase } = buildHarness();

    await usecase.execute(buildCommand());

    const manifest = parseSentManifest(axiosPost);
    expect(manifest.settings.token_rotation_enabled).to.equal(true);
  });
});
