import { BadRequestException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger, UpsertControlValuesUseCase } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  EnvironmentRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
  PreferencesRepository,
} from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, PreferencesTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { GenerateUniqueApiKey } from '../../../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { hashApiKey, KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX } from '../../../keyless/keyless-agent-environment';
import { KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_WORKFLOW_IDENTIFIER } from '../../utils';
import { CreateKeylessEnvironmentCommand, KeylessEnvironmentPurposeEnum } from './create-keyless-environment.command';
import { CreateKeylessEnvironment } from './create-keyless-environment.usecase';

const ENV_KEYS = [
  'NOVU_ENTERPRISE',
  'KEYLESS_ORGANIZATION_ID',
  'KEYLESS_USER_EMAIL',
  'NOVU_MANAGED_CLAUDE_API_KEY',
  'STORE_ENCRYPTION_KEY',
];

describe('CreateKeylessEnvironment', () => {
  const organization = { _id: 'keyless-org-id' };
  const user = { _id: 'keyless-user-id' };
  let originalEnv: Record<string, string | undefined>;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let organizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let userRepository: sinon.SinonStubbedInstance<CommunityUserRepository>;
  let generateUniqueApiKey: sinon.SinonStubbedInstance<GenerateUniqueApiKey>;
  let createNovuIntegrations: sinon.SinonStubbedInstance<CreateNovuIntegrations>;
  let notificationTemplateRepository: sinon.SinonStubbedInstance<NotificationTemplateRepository>;
  let messageTemplateRepository: sinon.SinonStubbedInstance<MessageTemplateRepository>;
  let preferencesRepository: sinon.SinonStubbedInstance<PreferencesRepository>;
  let upsertControlValues: sinon.SinonStubbedInstance<UpsertControlValuesUseCase>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let usecase: CreateKeylessEnvironment;

  const execute = (purpose: KeylessEnvironmentPurposeEnum) =>
    usecase.execute(CreateKeylessEnvironmentCommand.create({ purpose }));

  const expectBadRequest = async (purpose: KeylessEnvironmentPurposeEnum, message: string) => {
    try {
      await execute(purpose);
      expect.fail('Expected BadRequestException');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as Error).message).to.contain(message);
    }
  };

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.KEYLESS_ORGANIZATION_ID = organization._id;
    process.env.KEYLESS_USER_EMAIL = 'keyless@example.com';
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'managed-claude-key';
    process.env.STORE_ENCRYPTION_KEY = 'XgVGHwIk^42&8v&xFowz1mp6^P3r*9l0';

    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    organizationRepository = sinon.createStubInstance(CommunityOrganizationRepository);
    userRepository = sinon.createStubInstance(CommunityUserRepository);
    generateUniqueApiKey = sinon.createStubInstance(GenerateUniqueApiKey);
    createNovuIntegrations = sinon.createStubInstance(CreateNovuIntegrations);
    notificationTemplateRepository = sinon.createStubInstance(NotificationTemplateRepository);
    messageTemplateRepository = sinon.createStubInstance(MessageTemplateRepository);
    preferencesRepository = sinon.createStubInstance(PreferencesRepository);
    upsertControlValues = sinon.createStubInstance(UpsertControlValuesUseCase);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);

    organizationRepository.findById.resolves(organization as any);
    userRepository.findByEmail.resolves(user as any);
    generateUniqueApiKey.execute.resolves('generated-key');
    featureFlagsService.getFlag.resolves(true);
    environmentRepository.create.callsFake(
      async (data) => ({ ...data, _id: 'env-id', createdAt: '2026-10-14T20:00:00.000Z' }) as any
    );
    messageTemplateRepository.create.resolves({ _id: 'message-template-id' } as any);
    notificationTemplateRepository.create.resolves({
      _id: 'workflow-id',
      steps: [{ _templateId: 'message-template-id' }],
    } as any);

    usecase = new CreateKeylessEnvironment(
      environmentRepository as any,
      organizationRepository as any,
      userRepository as any,
      generateUniqueApiKey as any,
      createNovuIntegrations as any,
      notificationTemplateRepository as any,
      messageTemplateRepository as any,
      preferencesRepository as any,
      upsertControlValues as any,
      featureFlagsService as any,
      sinon.createStubInstance(PinoLogger) as any
    );
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }

    sinon.restore();
  });

  describe('inbox-demo purpose', () => {
    it('creates a prefixed environment with managed Claude and the hello-world seed', async () => {
      const { environment, secretKey } = await execute(KeylessEnvironmentPurposeEnum.INBOX_DEMO);

      expect(environment.identifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)).to.be.true;
      expect(environment.name.startsWith('Keyless ')).to.be.true;
      expect(environment.name.startsWith(KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX)).to.be.false;
      expect(secretKey).to.equal('sk_generated-key');
      expect(environment.apiKeys[0]).to.include({ _userId: user._id, hash: hashApiKey(secretKey) });

      const integrationsCommand = createNovuIntegrations.execute.firstCall.args[0];
      expect(integrationsCommand.includeManagedClaude).to.be.true;
      expect(integrationsCommand.channels).to.deep.equal([ChannelTypeEnum.IN_APP, ChannelTypeEnum.EMAIL]);

      const workflow = notificationTemplateRepository.create.firstCall.args[0];
      expect(workflow.triggers?.[0].identifier).to.equal(KEYLESS_WORKFLOW_IDENTIFIER);
      expect(workflow.origin).to.equal(ResourceOriginEnum.NOVU_CLOUD);
      expect(preferencesRepository.create.getCalls().map((call) => call.args[0].type)).to.deep.equal([
        PreferencesTypeEnum.USER_WORKFLOW,
        PreferencesTypeEnum.WORKFLOW_RESOURCE,
      ]);
      expect(upsertControlValues.execute.calledOnce).to.be.true;
      expect(upsertControlValues.execute.firstCall.args[0].newControlValues).to.include.keys(
        'primaryAction',
        'secondaryAction'
      );
    });

    it('requires the enterprise edition', async () => {
      process.env.NOVU_ENTERPRISE = 'false';

      await expectBadRequest(KeylessEnvironmentPurposeEnum.INBOX_DEMO, 'community edition');
      expect(organizationRepository.findById.called).to.be.false;
    });

    it('requires managed Claude credentials', async () => {
      delete process.env.NOVU_MANAGED_CLAUDE_API_KEY;

      await expectBadRequest(KeylessEnvironmentPurposeEnum.INBOX_DEMO, 'NOVU_MANAGED_CLAUDE_API_KEY');
      expect(environmentRepository.create.called).to.be.false;
    });

    it('checks the creation and demo managed Claude flags', async () => {
      featureFlagsService.getFlag.callsFake(
        async ({ key }) => key !== FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED
      );

      await expectBadRequest(KeylessEnvironmentPurposeEnum.INBOX_DEMO, 'IS_DEMO_MANAGED_CLAUDE_ENABLED');
      expect(featureFlagsService.getFlag.getCalls().map((call) => call.args[0].key)).to.deep.equal([
        FeatureFlagsKeysEnum.IS_KEYLESS_ENVIRONMENT_CREATION_ENABLED,
        FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED,
      ]);
    });
  });

  describe('agent purpose', () => {
    it('creates a non-prefixed agent environment without managed Claude', async () => {
      delete process.env.NOVU_MANAGED_CLAUDE_API_KEY;
      featureFlagsService.getFlag.resolves(false);

      const { environment, secretKey } = await execute(KeylessEnvironmentPurposeEnum.AGENT);

      expect(environment.identifier).to.have.length(12);
      expect(environment.identifier.startsWith(KEYLESS_ENVIRONMENT_PREFIX)).to.be.false;
      expect(environment.name.startsWith(KEYLESS_AGENT_ENVIRONMENT_NAME_PREFIX)).to.be.true;
      expect(environment.apiKeys[0].hash).to.equal(hashApiKey(secretKey));
      expect(featureFlagsService.getFlag.called).to.be.false;
      expect(createNovuIntegrations.execute.firstCall.args[0].includeManagedClaude).to.be.false;
      expect(notificationTemplateRepository.create.firstCall.args[0].triggers?.[0].identifier).to.equal(
        KEYLESS_WORKFLOW_IDENTIFIER
      );
    });

    it('seeds hello-world with only subject and body so a subject/body payload renders', async () => {
      await execute(KeylessEnvironmentPurposeEnum.AGENT);

      const controls = upsertControlValues.execute.firstCall.args[0].newControlValues;
      expect(controls).to.include({ subject: '{{payload.subject}}', body: '{{payload.body}}' });
      expect(controls).to.not.have.any.keys('primaryAction', 'secondaryAction');
    });

    it('does not require the NOVU_ENTERPRISE flag (gated by the caller)', async () => {
      process.env.NOVU_ENTERPRISE = 'false';

      const { environment } = await execute(KeylessEnvironmentPurposeEnum.AGENT);

      expect(environment._id).to.equal('env-id');
    });
  });
});
