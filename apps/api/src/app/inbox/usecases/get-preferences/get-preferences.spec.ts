import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
} from '@novu/application-generic';
import { NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { PreferenceLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetPreferences } from './get-preferences.usecase';

const mockedSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber', firstName: 'test', lastName: 'test' };
const mockedWorkflowPreference: any = {
  level: PreferenceLevelEnum.TEMPLATE,
  preferences: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
      chat: true,
    },
    overrides: {
      email: false,
      in_app: false,
      sms: true,
      push: true,
      chat: false,
    },
  },
};

const mockedGlobalPreferences: any = {
  level: PreferenceLevelEnum.GLOBAL,
  preference: {
    enabled: true,
    channels: {
      email: true,
      in_app: true,
      sms: false,
      push: false,
      chat: true,
    },
  },
};
const mockedPreferencesResponse: any = [
  { level: mockedGlobalPreferences.level, preferences: mockedGlobalPreferences.preference },
  mockedWorkflowPreference,
];

const mockedWorkflow: any = [{}];

describe('GetPreferences', () => {
  let getPreferences: GetPreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let getSubscriberWorkflowMock: sinon.SinonStubbedInstance<GetSubscriberTemplatePreference>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let notificationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    getSubscriberWorkflowMock = sinon.createStubInstance(GetSubscriberTemplatePreference);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    notificationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);

    getPreferences = new GetPreferences(
      subscriberRepositoryMock as any,
      notificationTemplateRepositoryMock as any,
      getSubscriberWorkflowMock as any,
      getSubscriberGlobalPreferenceMock as any,
      analyticsServiceMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('it should throw exception when subscriber is not found', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
    };

    subscriberRepositoryMock.findOne.resolves(undefined);

    try {
      await getPreferences.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} not found`);
    }
  });

  it('it should return subscriber preferences', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
    };

    subscriberRepositoryMock.findBySubscriberId.resolves(mockedSubscriber);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedGlobalPreferences);
    notificationTemplateRepositoryMock.getActiveList.resolves(mockedWorkflow);
    getSubscriberWorkflowMock.execute.resolves(mockedWorkflowPreference);

    const result = await getPreferences.execute(command);

    expect(result).to.deep.equal(mockedPreferencesResponse);
  });
});
