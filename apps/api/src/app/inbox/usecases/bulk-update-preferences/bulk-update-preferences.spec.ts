import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService, FeatureFlagsService } from '@novu/application-generic';
import {
  ContextRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
  SubscriberRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, PreferenceLevelEnum, TriggerTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { UpdatePreferences } from '../update-preferences/update-preferences.usecase';
import { BulkUpdatePreferencesCommand } from './bulk-update-preferences.command';
import { BulkUpdatePreferences } from './bulk-update-preferences.usecase';

const mockedSubscriber: any = {
  _id: '6447aff3d89122e250412c29',
  subscriberId: 'test-mockSubscriber',
  firstName: 'test',
  lastName: 'test',
};

const mockedWorkflow1: any = {
  _id: '6447aff3d89122e250412c28',
  name: 'test-workflow-1',
  critical: false,
  triggers: [{ identifier: 'test-trigger-1' }],
  tags: [],
  data: undefined,
};

const mockedWorkflow2: any = {
  _id: '6447aff3d89122e250412c30',
  name: 'test-workflow-2',
  critical: false,
  triggers: [{ identifier: 'test-trigger-2' }],
  tags: [],
  data: undefined,
};

const mockedInboxPreference1: any = {
  level: PreferenceLevelEnum.TEMPLATE,
  enabled: true,
  channels: {
    email: true,
    in_app: true,
    sms: false,
    push: false,
    chat: true,
  },
  workflow: {
    id: mockedWorkflow1._id,
    identifier: mockedWorkflow1.triggers[0].identifier,
    name: mockedWorkflow1.name,
    critical: mockedWorkflow1.critical,
    tags: mockedWorkflow1.tags,
    data: mockedWorkflow1.data,
  },
};

const mockedInboxPreference2: any = {
  level: PreferenceLevelEnum.TEMPLATE,
  enabled: true,
  channels: {
    email: false,
    in_app: true,
    sms: true,
    push: false,
    chat: true,
  },
  workflow: {
    id: mockedWorkflow2._id,
    identifier: mockedWorkflow2.triggers[0].identifier,
    name: mockedWorkflow2.name,
    critical: mockedWorkflow2.critical,
    tags: mockedWorkflow2.tags,
    data: mockedWorkflow2.data,
  },
};

describe('BulkUpdatePreferences', () => {
  let bulkUpdatePreferences: BulkUpdatePreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let notificationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;
  let updatePreferencesUsecaseMock: sinon.SinonStubbedInstance<UpdatePreferences>;
  let environmentRepositoryMock: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let contextRepositoryMock: sinon.SinonStubbedInstance<ContextRepository>;
  let featureFlagsServiceMock: sinon.SinonStubbedInstance<FeatureFlagsService>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);
    updatePreferencesUsecaseMock = sinon.createStubInstance(UpdatePreferences);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);
    contextRepositoryMock = sinon.createStubInstance(ContextRepository);
    featureFlagsServiceMock = sinon.createStubInstance(FeatureFlagsService);

    bulkUpdatePreferences = new BulkUpdatePreferences(
      notificationTemplateRepositoryMock as any,
      subscriberRepositoryMock as any,
      analyticsServiceMock as any,
      updatePreferencesUsecaseMock as any,
      environmentRepositoryMock as any,
      contextRepositoryMock as any,
      featureFlagsServiceMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      preferences: [
        {
          workflowId: mockedWorkflow1._id,
          in_app: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(undefined);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found`);
    }
  });

  it('should throw exception when no preferences are provided', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('No preferences provided for bulk update');
    }
  });

  it('should throw exception when preferences exceed maximum limit', async () => {
    const preferences = Array(101).fill({
      workflowIdOrInternalId: mockedWorkflow1._id,
      in_app: true,
    });

    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences,
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(UnprocessableEntityException);
      expect(error.message).to.equal('preferences must contain no more than 100 elements');
    }
  });

  it('should correctly separate internal IDs from identifiers when querying workflows', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: mockedWorkflow1._id,
          in_app: true,
        },
        {
          workflowId: 'test-trigger-2',
          in_app: false,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([mockedWorkflow1, mockedWorkflow2]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);
    updatePreferencesUsecaseMock.execute.onFirstCall().resolves(mockedInboxPreference1);
    updatePreferencesUsecaseMock.execute.onSecondCall().resolves(mockedInboxPreference2);

    await bulkUpdatePreferences.execute(command);

    const findCallArgs = notificationTemplateRepositoryMock.findForBulkPreferences.firstCall.args;
    expect(findCallArgs[0]).to.equal('env-1'); // environmentId
    expect(findCallArgs[1]).to.deep.equal([mockedWorkflow1._id]); // internal IDs
    expect(findCallArgs[2]).to.deep.equal(['test-trigger-2']); // identifiers
  });

  it('should handle mixed ID types correctly', async () => {
    const nonObjectIdString = 'simple-identifier-string';

    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: mockedWorkflow1._id, // ObjectId
          in_app: true,
        },
        {
          workflowId: nonObjectIdString, // Non-ObjectId string
          email: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([
      mockedWorkflow1,
      { ...mockedWorkflow2, triggers: [{ type: TriggerTypeEnum.EVENT, identifier: nonObjectIdString }] },
    ]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);
    updatePreferencesUsecaseMock.execute.onFirstCall().resolves(mockedInboxPreference1);
    updatePreferencesUsecaseMock.execute.onSecondCall().resolves({
      ...mockedInboxPreference2,
      workflow: { ...mockedInboxPreference2.workflow, identifier: nonObjectIdString },
    });

    await bulkUpdatePreferences.execute(command);

    const findCallArgs = notificationTemplateRepositoryMock.findForBulkPreferences.firstCall.args;
    expect(findCallArgs[1]).to.include(mockedWorkflow1._id); // internal IDs
    expect(findCallArgs[2]).to.include(nonObjectIdString); // identifiers
  });

  it('should deduplicate preferences when different identifiers resolve to the same workflow', async () => {
    const internalId = mockedWorkflow1._id;
    const triggerIdentifier = mockedWorkflow1.triggers[0].identifier;

    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: internalId,
          in_app: true,
          email: false,
        },
        {
          workflowId: triggerIdentifier,
          in_app: false,
          email: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([mockedWorkflow1]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);
    updatePreferencesUsecaseMock.execute.resolves(mockedInboxPreference1);

    const result = await bulkUpdatePreferences.execute(command);

    expect(updatePreferencesUsecaseMock.execute.callCount).to.equal(1);

    const updateArgs = updatePreferencesUsecaseMock.execute.firstCall.args[0];
    expect(updateArgs).to.include({
      workflowIdOrIdentifier: internalId,
      in_app: false,
      email: true,
    });

    expect(result.length).to.equal(1);
  });

  it('should throw exception when a workflow is not found', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: 'non-existent-id',
          in_app: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([]);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.include('Workflows with ids: non-existent-id not found');
    }
  });

  it('should throw exception when a workflow is critical', async () => {
    const criticalWorkflow = { ...mockedWorkflow1, critical: true };

    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: criticalWorkflow._id,
          in_app: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([criticalWorkflow]);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.include(`Critical workflows with ids: ${criticalWorkflow._id} cannot be updated`);
    }
  });

  it('should pass session context keys to workflow updates when context preferences are enabled and body has no context', async () => {
    const sessionContextKeys = ['tenant:first-tenant'];

    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      contextKeys: sessionContextKeys,
      preferences: [
        {
          workflowId: mockedWorkflow1._id,
          in_app: true,
        },
      ],
    });

    featureFlagsServiceMock.getFlag.callsFake(async ({ key }) => {
      if (key === FeatureFlagsKeysEnum.IS_CONTEXT_PREFERENCES_ENABLED) {
        return true;
      }

      return false;
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([mockedWorkflow1]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);
    updatePreferencesUsecaseMock.execute.resolves(mockedInboxPreference1);

    await bulkUpdatePreferences.execute(command);

    expect(contextRepositoryMock.findOrCreateContextsFromPayload.called).to.be.false;

    const updateArgs = updatePreferencesUsecaseMock.execute.firstCall.args[0];
    expect(updateArgs.contextKeys).to.deep.equal(sessionContextKeys);
  });

  it('should update multiple workflow preferences in parallel', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: mockedWorkflow1._id,
          in_app: true,
          email: false,
        },
        {
          workflowId: mockedWorkflow2._id,
          sms: true,
          chat: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([mockedWorkflow1, mockedWorkflow2]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);

    updatePreferencesUsecaseMock.execute.onFirstCall().resolves(mockedInboxPreference1);
    updatePreferencesUsecaseMock.execute.onSecondCall().resolves(mockedInboxPreference2);

    const result = await bulkUpdatePreferences.execute(command);

    expect(updatePreferencesUsecaseMock.execute.calledTwice).to.be.true;

    const firstCallArgs = updatePreferencesUsecaseMock.execute.firstCall.args[0];
    expect(firstCallArgs).to.include({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      workflowIdOrIdentifier: mockedWorkflow1._id,
      level: PreferenceLevelEnum.TEMPLATE,
      in_app: true,
      email: false,
    });

    const secondCallArgs = updatePreferencesUsecaseMock.execute.secondCall.args[0];
    expect(secondCallArgs).to.include({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      workflowIdOrIdentifier: mockedWorkflow2._id,
      level: PreferenceLevelEnum.TEMPLATE,
      sms: true,
      chat: true,
    });

    expect(result).to.deep.equal([mockedInboxPreference1, mockedInboxPreference2]);
  });

  it('should support lookup by workflow identifier', async () => {
    const command = BulkUpdatePreferencesCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
      preferences: [
        {
          workflowId: 'test-trigger-1', // Using identifier instead of ID
          in_app: true,
        },
      ],
    });

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    notificationTemplateRepositoryMock.findForBulkPreferences.resolves([mockedWorkflow1]);
    environmentRepositoryMock.findOne.resolves({ _id: 'env-1' } as any);
    updatePreferencesUsecaseMock.execute.resolves(mockedInboxPreference1);

    const result = await bulkUpdatePreferences.execute(command);

    const updateArgs = updatePreferencesUsecaseMock.execute.firstCall.args[0];
    expect(updateArgs.workflowIdOrIdentifier).to.equal(mockedWorkflow1._id);

    expect(result).to.deep.equal([mockedInboxPreference1]);
  });
});
