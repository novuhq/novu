import { GetDecryptedIntegrations, MsTeamsTokenService, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { MsTeamsHealthCheckCommand } from './msteams-health-check.command';
import { MsTeamsHealthCheck } from './msteams-health-check.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_INTEGRATION_ID = 'integration-id-789';
const MOCK_CLIENT_ID = 'azure-client-id';
const MOCK_TENANT_ID = 'azure-tenant-id';
const MOCK_SECRET_KEY = 'azure-secret';
const MOCK_GRAPH_TOKEN = 'graph-token';

const ROLE_IDS = {
  DIRECTORY_READ_ALL: '7ab1d382-f21e-4acd-a863-ba3e13f7da61',
  TEAM_READ_BASIC_ALL: '2280dda6-0bfd-44ee-a2f4-cb867cfc4c1e',
  CHANNEL_READ_BASIC_ALL: '59a6b24b-4225-4393-8165-ebaec5f55d7a',
  APP_CATALOG_READ_ALL: 'e12dae10-5a57-4817-b79d-dfbec5348930',
  TEAMS_APP_INSTALLATION_READ_WRITE_SELF_FOR_TEAM_ALL: '9f67436c-5415-4e7f-8ac1-3014a7132630',
  TEAMS_APP_INSTALLATION_READ_WRITE_SELF_FOR_USER_ALL: '908de74d-f8b2-4d6b-a9ed-2a17b3b78179',
};

const REQUIRED_ROLE_IDS = [
  ROLE_IDS.DIRECTORY_READ_ALL,
  ROLE_IDS.TEAM_READ_BASIC_ALL,
  ROLE_IDS.CHANNEL_READ_BASIC_ALL,
  ROLE_IDS.APP_CATALOG_READ_ALL,
];

const RECOMMENDED_ROLE_IDS = [
  ROLE_IDS.TEAMS_APP_INSTALLATION_READ_WRITE_SELF_FOR_TEAM_ALL,
  ROLE_IDS.TEAMS_APP_INSTALLATION_READ_WRITE_SELF_FOR_USER_ALL,
];

function buildMockIntegration(overrides: Record<string, unknown> = {}) {

  return {
    _id: MOCK_INTEGRATION_ID,
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: 'msteams-integration',
    providerId: ChatProviderIdEnum.MsTeams,
    credentials: {
      clientId: MOCK_CLIENT_ID,
      secretKey: MOCK_SECRET_KEY,
      tenantId: MOCK_TENANT_ID,
    },
    ...overrides,
  } as any;
}

function buildCommand(checks?: string[]) {
  const command = {
    environmentId: MOCK_ENVIRONMENT_ID,
    organizationId: MOCK_ORGANIZATION_ID,
    integrationId: MOCK_INTEGRATION_ID,
    ...(checks ? { checks } : {}),
  };

  return MsTeamsHealthCheckCommand.create(command);
}

function stubPermissionsGraphCalls(axiosGetStub: sinon.SinonStub, appRoleIds: string[]) {
  axiosGetStub.onFirstCall().resolves({ data: { value: [{ id: 'service-principal-id' }] } });
  axiosGetStub.onSecondCall().resolves({
    data: {
      value: appRoleIds.map((appRoleId) => ({ appRoleId })),
    },
  });
}

describe('MsTeamsHealthCheck', () => {
  let usecase: MsTeamsHealthCheck;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let msTeamsTokenService: sinon.SinonStubbedInstance<MsTeamsTokenService>;
  let logger: sinon.SinonStubbedInstance<PinoLogger>;
  let axiosGetStub: sinon.SinonStub;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    msTeamsTokenService = sinon.createStubInstance(MsTeamsTokenService);
    logger = sinon.createStubInstance(PinoLogger);
    axiosGetStub = sinon.stub(axios, 'get');

    integrationRepository.findOne.resolves(buildMockIntegration());
    msTeamsTokenService.getGraphToken.resolves(MOCK_GRAPH_TOKEN);
    sinon.stub(GetDecryptedIntegrations, 'getDecryptedCredentials').callsFake((integration) => integration as any);

    usecase = new MsTeamsHealthCheck(integrationRepository as any, msTeamsTokenService as any, logger as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('permissions', () => {
    it('should be ready when all required roles are granted and recommended roles are missing', async () => {
      stubPermissionsGraphCalls(axiosGetStub, REQUIRED_ROLE_IDS);

      const result = await usecase.execute(buildCommand(['permissions']));

      expect(result.permissions).to.equal('ready');
      expect(result.missingRequiredPermissions).to.deep.equal([]);
      expect(result.missingRecommendedPermissions).to.deep.equal([
        'TeamsAppInstallation.ReadWriteSelfForTeam.All',
        'TeamsAppInstallation.ReadWriteSelfForUser.All',
      ]);
    });

    it('should be pending when a required role is missing and list it by name', async () => {
      stubPermissionsGraphCalls(axiosGetStub, [
        ROLE_IDS.DIRECTORY_READ_ALL,
        ROLE_IDS.TEAM_READ_BASIC_ALL,
        ROLE_IDS.APP_CATALOG_READ_ALL,
        ...RECOMMENDED_ROLE_IDS,
      ]);

      const result = await usecase.execute(buildCommand(['permissions']));

      expect(result.permissions).to.equal('pending');
      expect(result.missingRequiredPermissions).to.deep.equal(['Channel.ReadBasic.All']);
      expect(result.missingRecommendedPermissions).to.deep.equal([]);
    });
  });

  describe('teamsAppCatalog', () => {
    it('should return teamsAppCatalogId when a catalog entry is found', async () => {
      axiosGetStub.resolves({ data: { value: [{ id: 'teams-app-catalog-id' }] } });

      const result = await usecase.execute(buildCommand(['teamsAppCatalog']));

      expect(result.teamsAppCatalog).to.equal('ready');
      expect(result.teamsAppCatalogId).to.equal('teams-app-catalog-id');
    });

    it('should return null teamsAppCatalogId when the catalog entry is absent', async () => {
      axiosGetStub.resolves({ data: { value: [] } });

      const result = await usecase.execute(buildCommand(['teamsAppCatalog']));

      expect(result.teamsAppCatalog).to.equal('pending');
      expect(result.teamsAppCatalogId).to.equal(null);
    });
  });

  describe('missing credentials', () => {
    it('should fail requested statuses with empty missing permission arrays and null catalog id', async () => {
      integrationRepository.findOne.resolves(buildMockIntegration({ credentials: undefined }));

      const result = await usecase.execute(buildCommand());

      expect(result).to.deep.equal({
        appRegistration: 'failed',
        azureBotCreated: 'failed',
        teamsAppCatalog: 'failed',
        permissions: 'failed',
        missingRequiredPermissions: [],
        missingRecommendedPermissions: [],
        teamsAppCatalogId: null,
        allReady: false,
      });
      expect(msTeamsTokenService.getGraphToken.called).to.equal(false);
      expect(axiosGetStub.called).to.equal(false);
    });
  });
});
