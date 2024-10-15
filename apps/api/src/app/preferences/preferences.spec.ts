import { Test } from '@nestjs/testing';
import {
  GetPreferences,
  UpsertPreferences,
  UpsertSubscriberGlobalPreferencesCommand,
  UpsertSubscriberWorkflowPreferencesCommand,
  UpsertUserWorkflowPreferencesCommand,
  UpsertWorkflowPreferencesCommand,
} from '@novu/application-generic';
import { PreferencesRepository, SubscriberRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, PreferencesTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { AuthModule } from '../auth/auth.module';
import { PreferencesModule } from './preferences.module';

describe('Preferences', function () {
  let getPreferences: GetPreferences;
  const subscriberId = SubscriberRepository.createObjectId();
  const workflowId = PreferencesRepository.createObjectId();
  let upsertPreferences: UpsertPreferences;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PreferencesModule, AuthModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    getPreferences = moduleRef.get<GetPreferences>(GetPreferences);
    upsertPreferences = moduleRef.get<UpsertPreferences>(UpsertPreferences);
  });

  describe('Upsert preferences', function () {
    it('should create workflow preferences', async function () {
      const workflowPreferences = await upsertPreferences.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      expect(workflowPreferences._environmentId).to.equal(session.environment._id);
      expect(workflowPreferences._organizationId).to.equal(session.organization._id);
      expect(workflowPreferences._templateId).to.equal(workflowId);
      expect(workflowPreferences._userId).to.be.undefined;
      expect(workflowPreferences._subscriberId).to.be.undefined;
      expect(workflowPreferences.type).to.equal(PreferencesTypeEnum.WORKFLOW_RESOURCE);
    });

    it('should create user workflow preferences', async function () {
      const userPreferences = await upsertPreferences.upsertUserWorkflowPreferences(
        UpsertUserWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          userId: session.user._id,
        })
      );

      expect(userPreferences._environmentId).to.equal(session.environment._id);
      expect(userPreferences._organizationId).to.equal(session.organization._id);
      expect(userPreferences._templateId).to.equal(workflowId);
      expect(userPreferences._userId).to.equal(session.user._id);
      expect(userPreferences._subscriberId).to.be.undefined;
      expect(userPreferences.type).to.equal(PreferencesTypeEnum.USER_WORKFLOW);
    });

    it('should create global subscriber preferences', async function () {
      const subscriberGlobalPreferences = await upsertPreferences.upsertSubscriberGlobalPreferences(
        UpsertSubscriberGlobalPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          _subscriberId: subscriberId,
        })
      );

      expect(subscriberGlobalPreferences._environmentId).to.equal(session.environment._id);
      expect(subscriberGlobalPreferences._organizationId).to.equal(session.organization._id);
      expect(subscriberGlobalPreferences._templateId).to.be.undefined;
      expect(subscriberGlobalPreferences._userId).to.be.undefined;
      expect(subscriberGlobalPreferences._subscriberId).to.equal(subscriberId);
      expect(subscriberGlobalPreferences.type).to.equal(PreferencesTypeEnum.SUBSCRIBER_GLOBAL);
    });

    it('should create subscriber workflow preferences', async function () {
      const subscriberWorkflowPreferences = await upsertPreferences.upsertSubscriberWorkflowPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          _subscriberId: subscriberId,
        })
      );

      expect(subscriberWorkflowPreferences._environmentId).to.equal(session.environment._id);
      expect(subscriberWorkflowPreferences._organizationId).to.equal(session.organization._id);
      expect(subscriberWorkflowPreferences._templateId).to.equal(workflowId);
      expect(subscriberWorkflowPreferences._userId).to.be.undefined;
      expect(subscriberWorkflowPreferences._subscriberId).to.equal(subscriberId);
      expect(subscriberWorkflowPreferences.type).to.equal(PreferencesTypeEnum.SUBSCRIBER_WORKFLOW);
    });

    it('should update preferences', async function () {
      let workflowPreferences = await upsertPreferences.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      expect(workflowPreferences._environmentId).to.equal(session.environment._id);
      expect(workflowPreferences._organizationId).to.equal(session.organization._id);
      expect(workflowPreferences._templateId).to.equal(workflowId);
      expect(workflowPreferences._userId).to.be.undefined;
      expect(workflowPreferences._subscriberId).to.be.undefined;
      expect(workflowPreferences.type).to.equal(PreferencesTypeEnum.WORKFLOW_RESOURCE);

      workflowPreferences = await upsertPreferences.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      expect(workflowPreferences.preferences.all.readOnly).to.be.true;
    });
  });

  describe('Get preferences', function () {
    it('should merge preferences when get preferences', async function () {
      // Workflow preferences
      await upsertPreferences.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      let preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
      });

      expect(preferences).to.deep.equal({
        preferences: {
          all: {
            enabled: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
        type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
        source: {
          [PreferencesTypeEnum.WORKFLOW_RESOURCE]: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.USER_WORKFLOW]: null,
          [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: null,
          [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: null,
        },
      });

      // User Workflow preferences
      await upsertPreferences.upsertUserWorkflowPreferences(
        UpsertUserWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          userId: session.user._id,
        })
      );

      preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
      });

      expect(preferences).to.deep.equal({
        preferences: {
          all: {
            enabled: false,
            readOnly: true,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
        type: PreferencesTypeEnum.USER_WORKFLOW,
        source: {
          [PreferencesTypeEnum.WORKFLOW_RESOURCE]: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.USER_WORKFLOW]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: null,
          [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: null,
        },
      });

      // Subscriber global preferences
      await upsertPreferences.upsertSubscriberGlobalPreferences(
        UpsertSubscriberGlobalPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          _subscriberId: subscriberId,
        })
      );

      preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
        subscriberId,
      });

      expect(preferences).to.deep.equal({
        preferences: {
          all: {
            enabled: false,
            readOnly: true,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
        type: PreferencesTypeEnum.USER_WORKFLOW,
        source: {
          [PreferencesTypeEnum.WORKFLOW_RESOURCE]: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.USER_WORKFLOW]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: null,
        },
      });

      // Subscriber Workflow preferences
      await upsertPreferences.upsertSubscriberWorkflowPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          _subscriberId: subscriberId,
        })
      );

      preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
        subscriberId,
      });

      expect(preferences).to.deep.equal({
        preferences: {
          all: {
            enabled: false,
            readOnly: true,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
        type: PreferencesTypeEnum.USER_WORKFLOW,
        source: {
          [PreferencesTypeEnum.WORKFLOW_RESOURCE]: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.USER_WORKFLOW]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: {
            all: {
              enabled: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
        },
      });
    });
  });

  describe('Preferences endpoints', function () {
    it('should get preferences', async function () {
      const useCase: UpsertPreferences = session.testServer?.getService(UpsertPreferences);

      await useCase.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          preferences: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      const { body } = await session.testAgent.get(`/v1/preferences?workflowId=${workflowId}`).send();

      expect(body.data).to.deep.equal({
        preferences: {
          all: {
            enabled: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
        type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
        source: {
          [PreferencesTypeEnum.WORKFLOW_RESOURCE]: {
            all: {
              enabled: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                enabled: false,
              },
              sms: {
                enabled: false,
              },
              email: {
                enabled: false,
              },
              push: {
                enabled: false,
              },
              chat: {
                enabled: false,
              },
            },
          },
          [PreferencesTypeEnum.USER_WORKFLOW]: null,
          [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: null,
          [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: null,
        },
      });
    });

    it('should upsert preferences', async function () {
      const { body } = await session.testAgent.post('/v1/preferences').send({
        workflowId,
        preferences: {
          all: {
            enabled: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              enabled: false,
            },
            sms: {
              enabled: false,
            },
            email: {
              enabled: false,
            },
            push: {
              enabled: false,
            },
            chat: {
              enabled: false,
            },
          },
        },
      });

      expect(body.data.preferences).to.deep.equal({
        all: {
          enabled: false,
          readOnly: false,
        },
        channels: {
          in_app: {
            enabled: false,
          },
          sms: {
            enabled: false,
          },
          email: {
            enabled: false,
          },
          push: {
            enabled: false,
          },
          chat: {
            enabled: false,
          },
        },
      });
    });
  });
});
