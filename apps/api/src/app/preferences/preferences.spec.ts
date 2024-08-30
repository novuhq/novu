import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';

import { GetPreferences, UpsertPreferences, UpsertPreferencesCommand } from '@novu/application-generic';
import { PreferencesModule } from './preferences.module';
import { PreferencesActorEnum, PreferencesRepository } from '@novu/dal';
import { AuthModule } from '../auth/auth.module';
import { expect } from 'chai';

describe('Preferences', function () {
  let getPreferences: GetPreferences;
  let subscriberId: string;
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

    subscriberId = session.subscriberId;

    getPreferences = moduleRef.get<GetPreferences>(GetPreferences);
    upsertPreferences = moduleRef.get<UpsertPreferences>(UpsertPreferences);
  });

  describe('Upsert preferences', function () {
    it('should create workflow preferences', async function () {
      const workflowPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
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
      expect(workflowPreferences.actor).to.equal(PreferencesActorEnum.WORKFLOW);
    });

    it('should create user workflow preferences', async function () {
      const userPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.USER,
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
      expect(userPreferences.actor).to.equal(PreferencesActorEnum.USER);
    });

    it('should create global subscriber preferences', async function () {
      const subscriberGlobalPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.SUBSCRIBER,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          subscriberId: subscriberId,
        })
      );

      expect(subscriberGlobalPreferences._environmentId).to.equal(session.environment._id);
      expect(subscriberGlobalPreferences._organizationId).to.equal(session.organization._id);
      expect(subscriberGlobalPreferences._templateId).to.be.undefined;
      expect(subscriberGlobalPreferences._userId).to.be.undefined;
      expect(subscriberGlobalPreferences._subscriberId).to.equal(subscriberId);
      expect(subscriberGlobalPreferences.actor).to.equal(PreferencesActorEnum.SUBSCRIBER);
    });

    it('should create subscriber workflow preferences', async function () {
      const subscriberWorkflowPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.SUBSCRIBER,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          subscriberId: subscriberId,
        })
      );

      expect(subscriberWorkflowPreferences._environmentId).to.equal(session.environment._id);
      expect(subscriberWorkflowPreferences._organizationId).to.equal(session.organization._id);
      expect(subscriberWorkflowPreferences._templateId).to.equal(workflowId);
      expect(subscriberWorkflowPreferences._userId).to.be.undefined;
      expect(subscriberWorkflowPreferences._subscriberId).to.equal(subscriberId);
      expect(subscriberWorkflowPreferences.actor).to.equal(PreferencesActorEnum.SUBSCRIBER);
    });

    it('should update preferences', async function () {
      let workflowPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
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
      expect(workflowPreferences.actor).to.equal(PreferencesActorEnum.WORKFLOW);

      workflowPreferences = await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      expect(workflowPreferences.preferences.workflow.readOnly).to.be.true;
    });

    it('should validate preferences', async function () {
      const preferences = {
        workflow: {
          defaultValue: false,
          readOnly: false,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      };

      try {
        await upsertPreferences.execute(
          UpsertPreferencesCommand.create({
            preferences,
            actor: PreferencesActorEnum.WORKFLOW,
            environmentId: session.environment._id,
            organizationId: session.organization._id,
          })
        );
        expect(false).to.be.true;
      } catch (e) {
        expect(e.message).to.equal('Template id is missing for preferences');
      }

      try {
        await upsertPreferences.execute(
          UpsertPreferencesCommand.create({
            preferences,
            actor: PreferencesActorEnum.USER,
            environmentId: session.environment._id,
            organizationId: session.organization._id,
            templateId: workflowId,
          })
        );
        expect(false).to.be.true;
      } catch (e) {
        expect(e.message).to.equal('User id is missing for preferences');
      }

      try {
        await upsertPreferences.execute(
          UpsertPreferencesCommand.create({
            preferences,
            actor: PreferencesActorEnum.SUBSCRIBER,
            environmentId: session.environment._id,
            organizationId: session.organization._id,
            templateId: workflowId,
          })
        );
        expect(false).to.be.true;
      } catch (e) {
        expect(e.message).to.equal('Subscriber id is missing for preferences');
      }
    });
  });

  describe('Get preferences', function () {
    it('should merge preferences when get preferences', async function () {
      // Workflow preferences
      await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
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
        workflow: {
          defaultValue: false,
          readOnly: false,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });

      // User Workflow preferences
      await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
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
        workflow: {
          defaultValue: false,
          readOnly: true,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });

      // Subscriber global preferences
      await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: true,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.SUBSCRIBER,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          subscriberId,
        })
      );

      preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
        subscriberId,
      });

      expect(preferences).to.deep.equal({
        workflow: {
          defaultValue: false,
          readOnly: true,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: true,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });

      // Subscriber Workflow preferences
      await upsertPreferences.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: true,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: true,
              },
              sms: {
                defaultValue: false,
                readOnly: true,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.SUBSCRIBER,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
          subscriberId,
        })
      );

      preferences = await getPreferences.execute({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        templateId: workflowId,
        subscriberId,
      });

      expect(preferences).to.deep.equal({
        workflow: {
          defaultValue: false,
          readOnly: true,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: true,
          },
          sms: {
            defaultValue: false,
            readOnly: true,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });
    });
  });

  describe('Preferences endpoints', function () {
    it('should get preferences', async function () {
      const useCase = session.testServer?.getService(UpsertPreferences);

      await useCase.execute(
        UpsertPreferencesCommand.create({
          preferences: {
            workflow: {
              defaultValue: false,
              readOnly: false,
            },
            channels: {
              in_app: {
                defaultValue: false,
                readOnly: false,
              },
              sms: {
                defaultValue: false,
                readOnly: false,
              },
              email: {
                defaultValue: false,
                readOnly: false,
              },
              push: {
                defaultValue: false,
                readOnly: false,
              },
              chat: {
                defaultValue: false,
                readOnly: false,
              },
            },
          },
          actor: PreferencesActorEnum.WORKFLOW,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          templateId: workflowId,
        })
      );

      const { body } = await session.testAgent.get('/v1/preferences?workflowId=' + workflowId).send();

      expect(body.data).to.deep.equal({
        workflow: {
          defaultValue: false,
          readOnly: false,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });
    });

    it('should upsert preferences', async function () {
      const { body } = await session.testAgent.post('/v1/preferences').send({
        workflowId,
        preferences: {
          workflow: {
            defaultValue: false,
            readOnly: false,
          },
          channels: {
            in_app: {
              defaultValue: false,
              readOnly: false,
            },
            sms: {
              defaultValue: false,
              readOnly: false,
            },
            email: {
              defaultValue: false,
              readOnly: false,
            },
            push: {
              defaultValue: false,
              readOnly: false,
            },
            chat: {
              defaultValue: false,
              readOnly: false,
            },
          },
        },
      });

      expect(body.data.preferences).to.deep.equal({
        workflow: {
          defaultValue: false,
          readOnly: false,
        },
        channels: {
          in_app: {
            defaultValue: false,
            readOnly: false,
          },
          sms: {
            defaultValue: false,
            readOnly: false,
          },
          email: {
            defaultValue: false,
            readOnly: false,
          },
          push: {
            defaultValue: false,
            readOnly: false,
          },
          chat: {
            defaultValue: false,
            readOnly: false,
          },
        },
      });
    });
  });
});
