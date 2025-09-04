import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { EnvironmentRepository, NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum, TriggerTypeEnum } from '@novu/shared';
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
  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);
    updatePreferencesUsecaseMock = sinon.createStubInstance(UpdatePreferences);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);
    bulkUpdatePreferences = new BulkUpdatePreferences(
      notificationTemplateRepositoryMock as any,
      subscriberRepositoryMock as any,
      analyticsServiceMock as any,
      updatePreferencesUsecaseMock as any,
      environmentRepositoryMock as any
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
    notificationTemplateRepositoryMock.find.resolves([mockedWorkflow1, mockedWorkflow2]);
    updatePreferencesUsecaseMock.execute.onFirstCall().resolves(mockedInboxPreference1);
    updatePreferencesUsecaseMock.execute.onSecondCall().resolves(mockedInboxPreference2);

    await bulkUpdatePreferences.execute(command);

    const findCallArgs = notificationTemplateRepositoryMock.find.firstCall.args[0];
    expect(findCallArgs).to.deep.equal({
      _environmentId: 'env-1',
      $or: [{ _id: { $in: [mockedWorkflow1._id] } }, { 'triggers.identifier': { $in: ['test-trigger-2'] } }],
    });
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
    notificationTemplateRepositoryMock.find.resolves([
      mockedWorkflow1,
      { ...mockedWorkflow2, triggers: [{ type: TriggerTypeEnum.EVENT, identifier: nonObjectIdString }] },
    ]);
    updatePreferencesUsecaseMock.execute.onFirstCall().resolves(mockedInboxPreference1);
    updatePreferencesUsecaseMock.execute.onSecondCall().resolves({
      ...mockedInboxPreference2,
      workflow: { ...mockedInboxPreference2.workflow, identifier: nonObjectIdString },
    });

    await bulkUpdatePreferences.execute(command);

    const findCallArgs = notificationTemplateRepositoryMock.find.firstCall.args[0];
    expect(findCallArgs?.$or?.[0]?._id?.$in).to.include(mockedWorkflow1._id);
    expect(findCallArgs?.$or?.[1]?.['triggers.identifier']?.$in).to.include(nonObjectIdString);
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
    notificationTemplateRepositoryMock.find.resolves([mockedWorkflow1]);
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
    notificationTemplateRepositoryMock.find.resolves([]);

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
    notificationTemplateRepositoryMock.find.resolves([criticalWorkflow]);

    try {
      await bulkUpdatePreferences.execute(command);
      expect.fail('Should throw an exception');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.include(`Critical workflows with ids: ${criticalWorkflow._id} cannot be updated`);
    }
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
    notificationTemplateRepositoryMock.find.resolves([mockedWorkflow1, mockedWorkflow2]);

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

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;

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
    notificationTemplateRepositoryMock.find.resolves([mockedWorkflow1]);
    updatePreferencesUsecaseMock.execute.resolves(mockedInboxPreference1);

    const result = await bulkUpdatePreferences.execute(command);

    const updateArgs = updatePreferencesUsecaseMock.execute.firstCall.args[0];
    expect(updateArgs.workflowIdOrIdentifier).to.equal(mockedWorkflow1._id);

    expect(result).to.deep.equal([mockedInboxPreference1]);
  });
});
