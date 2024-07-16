import sinon from 'sinon';
import { expect } from 'chai';
import { PreferenceLevelEnum } from '@novu/shared';
import { GetPreferences } from './get-preferences.usecase';
import { MessageRepository, SubscriberRepository, NotificationTemplateRepository } from '@novu/dal';
import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberWorkflowPreference,
} from '@novu/application-generic';

const mockedSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber', firstName: 'test', lastName: 'test' };
const mockedPreferences: any = [
  {
    level: PreferenceLevelEnum.GLOBAL,
    preferences: {
      enabled: true,
      channels: {
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      },
    },
  },
  {
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
  },
];

describe('GetPreferences', () => {
  let getPreferences: GetPreferences;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let getSubscriberWorkflowMock: sinon.SinonStubbedInstance<GetSubscriberWorkflowPreference>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let getSubscriberGlobalPreferenceMock: sinon.SinonStubbedInstance<GetSubscriberGlobalPreference>;
  let notifcationTemplateRepositoryMock: sinon.SinonStubbedInstance<NotificationTemplateRepository>;

  beforeEach(() => {
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    getSubscriberWorkflowMock = sinon.createStubInstance(GetSubscriberWorkflowPreference);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    getSubscriberGlobalPreferenceMock = sinon.createStubInstance(GetSubscriberGlobalPreference);
    notifcationTemplateRepositoryMock = sinon.createStubInstance(NotificationTemplateRepository);

    getPreferences = new GetPreferences(
      subscriberRepositoryMock as any,
      notifcationTemplateRepositoryMock as any,
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
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('it should return subscriber preferences', async () => {
    const command = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'test-mockSubscriber',
    };

    subscriberRepositoryMock.findOne.resolves(mockedSubscriber);
    getSubscriberGlobalPreferenceMock.execute.resolves(mockedPreferences[0]);
    getSubscriberWorkflowMock.execute.resolves(mockedPreferences[1]);

    const result = await getPreferences.execute(command);

    expect(result).to.deep.equal(mockedPreferences);
  });
});
