import { EmailBlockTypeEnum, PreferenceLevelEnum, StepTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Update global preferences - /inbox/preferences (PATCH) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw error when made unauthorized call', async () => {
    const response = await session.testAgent
      .patch(`/v1/inbox/preferences`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should update global preferences', async () => {
    const response = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.channels.email).to.equal(undefined);
    expect(response.body.data.channels.in_app).to.equal(undefined);
    expect(response.body.data.channels.sms).to.equal(undefined);
    expect(response.body.data.channels.push).to.equal(undefined);
    expect(response.body.data.channels.chat).to.equal(undefined);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);
  });

  it('should update the particular channel sent in the body and return only active channels', async () => {
    await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content',
        },
      ],
    });

    const response = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        in_app: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.channels.email).to.equal(undefined);
    expect(response.body.data.channels.in_app).to.equal(true);
    expect(response.body.data.channels.sms).to.equal(undefined);
    expect(response.body.data.channels.push).to.equal(undefined);
    expect(response.body.data.channels.chat).to.equal(undefined);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);

    const responseSecond = await session.testAgent
      .patch('/v1/inbox/preferences')
      .send({
        in_app: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(responseSecond.status).to.equal(200);
    expect(responseSecond.body.data.channels.email).to.equal(undefined);
    expect(responseSecond.body.data.channels.in_app).to.equal(true);
    expect(responseSecond.body.data.channels.sms).to.equal(undefined);
    expect(responseSecond.body.data.channels.push).to.equal(undefined);
    expect(responseSecond.body.data.channels.chat).to.equal(undefined);
    expect(responseSecond.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);
  });

  describe('schedule functionality', () => {
    it('should update global preferences with schedule', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          tuesday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          wednesday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          thursday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
          friday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          email: true,
          in_app: true,
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.schedule).to.exist;
      expect(response.body.data.schedule.isEnabled).to.equal(true);
      expect(response.body.data.schedule.weeklySchedule).to.exist;
      expect(response.body.data.schedule.weeklySchedule.monday.isEnabled).to.equal(true);
      expect(response.body.data.schedule.weeklySchedule.monday.hours[0].start).to.equal('09:00 AM');
      expect(response.body.data.schedule.weeklySchedule.monday.hours[0].end).to.equal('05:00 PM');
      expect(response.body.data.schedule.weeklySchedule.tuesday.isEnabled).to.equal(true);
      expect(response.body.data.schedule.weeklySchedule.tuesday.hours[0].start).to.equal('09:00 AM');
      expect(response.body.data.schedule.weeklySchedule.tuesday.hours[0].end).to.equal('05:00 PM');
      expect(response.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);
    });

    it('should update schedule with disabled state', async () => {
      const schedule = {
        isEnabled: false,
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.schedule).to.exist;
      expect(response.body.data.schedule.isEnabled).to.equal(false);
      expect(response.body.data.schedule.weeklySchedule).to.not.exist;
    });

    it('should update schedule with multiple time ranges', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [
              { start: '09:00 AM', end: '12:00 PM' },
              { start: '01:00 PM', end: '05:00 PM' },
            ],
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.schedule).to.exist;
      expect(response.body.data.schedule.weeklySchedule.monday.hours).to.have.length(2);
      expect(response.body.data.schedule.weeklySchedule.monday.hours[0].start).to.equal('09:00 AM');
      expect(response.body.data.schedule.weeklySchedule.monday.hours[0].end).to.equal('12:00 PM');
      expect(response.body.data.schedule.weeklySchedule.monday.hours[1].start).to.equal('01:00 PM');
      expect(response.body.data.schedule.weeklySchedule.monday.hours[1].end).to.equal('05:00 PM');
    });

    it('should fail validation when isEnabled is true but weeklySchedule is empty', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {},
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(422);
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.general.messages).to.be.an('array');
      expect(response.body.errors.general.messages[0]).to.contain(
        'weeklySchedule must contain at least one day configuration when isEnabled is true'
      );
    });

    it('should fail validation with invalid time format', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '25:00', end: '17:00' }], // Invalid 24-hour format
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(422);
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.general.messages).to.be.an('array');
      expect(response.body.errors.general.messages.some((msg: string) => msg.includes('must be in 12-hour format'))).to
        .be.true;
    });

    it('should fail validation with invalid day name', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {
          invalidDay: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(422);
      expect(response.body.message).to.equal('Validation Error');
      expect(response.body.errors.general.messages).to.be.an('array');
      expect(response.body.errors.general.messages[0]).to.contain('weeklySchedule contains invalid day names');
    });

    it('should handle schedule with isEnabled true but no weeklySchedule', async () => {
      const schedule = {
        isEnabled: true,
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.schedule).to.exist;
      expect(response.body.data.schedule.isEnabled).to.equal(true);
      expect(response.body.data.schedule.weeklySchedule).to.not.exist;
    });

    it('should update existing schedule', async () => {
      // First, set a schedule
      const initialSchedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule: initialSchedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      // Then update it
      const updatedSchedule = {
        isEnabled: true,
        weeklySchedule: {
          tuesday: {
            isEnabled: true,
            hours: [{ start: '10:00 AM', end: '06:00 PM' }],
          },
          wednesday: {
            isEnabled: true,
            hours: [{ start: '08:00 AM', end: '04:00 PM' }],
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          schedule: updatedSchedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.schedule.weeklySchedule.monday).to.not.exist;
      expect(response.body.data.schedule.weeklySchedule.tuesday).to.exist;
      expect(response.body.data.schedule.weeklySchedule.tuesday.hours[0].start).to.equal('10:00 AM');
      expect(response.body.data.schedule.weeklySchedule.wednesday).to.exist;
      expect(response.body.data.schedule.weeklySchedule.wednesday.hours[0].start).to.equal('08:00 AM');
    });

    it('should handle schedule update with channels update', async () => {
      const schedule = {
        isEnabled: true,
        weeklySchedule: {
          monday: {
            isEnabled: true,
            hours: [{ start: '09:00 AM', end: '05:00 PM' }],
          },
        },
      };

      const response = await session.testAgent
        .patch('/v1/inbox/preferences')
        .send({
          email: false,
          in_app: true,
          schedule,
        })
        .set('Authorization', `Bearer ${session.subscriberToken}`);

      expect(response.status).to.equal(200);
      expect(response.body.data.channels.email).to.equal(undefined);
      expect(response.body.data.channels.in_app).to.equal(undefined);
      expect(response.body.data.schedule).to.exist;
      expect(response.body.data.schedule.isEnabled).to.equal(true);
      expect(response.body.data.schedule.weeklySchedule.monday).to.exist;
    });
  });
});

describe('Update workflow preferences - /inbox/preferences/:workflowId (PATCH)', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should throw error when made unauthorized call', async () => {
    const workflow = await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });

  it('should throw error when non-mongo id is passed', async () => {
    const id = '1234';
    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);
    expect(response.body.statusCode).to.equal(422);
    expect(response.body.errors.workflowId.messages[0]).to.equal(`workflowId must be a mongodb id`);
    expect(response.status).to.equal(422);
  });

  it('should throw error when non-existing workflow id is passed', async () => {
    const id = '666c0dfa0b55d0f06f4aaa6c';
    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.body.message).to.equal(`Workflow with id: ${id} is not found`);
    expect(response.status).to.equal(404);
  });

  it('should throw error when tried to update a critical workflow', async () => {
    const workflow = await session.createTemplate({
      noFeedId: true,
      critical: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.body.message).to.equal(`Critical workflow with id: ${workflow._id} can not be updated`);
    expect(response.status).to.equal(400);
  });

  it('should update workflow preferences', async () => {
    const workflow = await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: false,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(Object.keys(response.body.data.channels).length).to.equal(2);
    expect(response.body.data.channels.email).to.equal(true);
    expect(response.body.data.channels.in_app).to.equal(false);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);
  });

  it('should update the particular channel sent in the body and return all channels', async () => {
    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Welcome to {{organizationName}}' as string,
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
        },
        {
          type: StepTypeEnum.EMAIL,
          content: [
            {
              type: EmailBlockTypeEnum.TEXT,
              content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
            },
          ],
        },
        {
          type: StepTypeEnum.CHAT,
          content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
        },
        {
          type: StepTypeEnum.PUSH,
          content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
        },
      ],
    });

    const response = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: true,
        in_app: true,
        sms: false,
        push: false,
        chat: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.channels.email).to.equal(true);
    expect(response.body.data.channels.in_app).to.equal(true);
    expect(response.body.data.channels.sms).to.equal(false);
    expect(response.body.data.channels.push).to.equal(false);
    expect(response.body.data.channels.chat).to.equal(true);
    expect(response.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);

    const responseSecond = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: false,
        in_app: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(responseSecond.status).to.equal(200);
    expect(responseSecond.body.data.channels.email).to.equal(false);
    expect(responseSecond.body.data.channels.in_app).to.equal(true);
    expect(responseSecond.body.data.channels.sms).to.equal(false);
    expect(responseSecond.body.data.channels.push).to.equal(false);
    expect(responseSecond.body.data.channels.chat).to.equal(true);
    expect(responseSecond.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);
  });

  it('should unset the suscribers workflow preference for the specified channels when the global preference is updated', async () => {
    const workflow = await session.createTemplate({
      noFeedId: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content',
        },
        {
          type: StepTypeEnum.EMAIL,
          content: 'Test notification content',
        },
      ],
    });

    const updateWorkflowPrefResponse = await session.testAgent
      .patch(`/v1/inbox/preferences/${workflow._id}`)
      .send({
        email: false,
        in_app: false,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(updateWorkflowPrefResponse.status).to.equal(200);
    expect(updateWorkflowPrefResponse.body.data.channels.email).to.equal(false);
    expect(updateWorkflowPrefResponse.body.data.channels.in_app).to.equal(false);
    expect(updateWorkflowPrefResponse.body.data.channels.sms).to.equal(undefined);
    expect(updateWorkflowPrefResponse.body.data.channels.push).to.equal(undefined);
    expect(updateWorkflowPrefResponse.body.data.channels.chat).to.equal(undefined);
    expect(updateWorkflowPrefResponse.body.data.level).to.equal(PreferenceLevelEnum.TEMPLATE);

    const updateGlobalPrefResponse = await session.testAgent
      .patch(`/v1/inbox/preferences`)
      .send({
        email: true,
      })
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    expect(updateGlobalPrefResponse.status).to.equal(200);
    expect(updateGlobalPrefResponse.body.data.channels.email).to.equal(true);
    expect(updateGlobalPrefResponse.body.data.channels.in_app).to.equal(true);
    expect(updateGlobalPrefResponse.body.data.channels.sms).to.equal(undefined);
    expect(updateGlobalPrefResponse.body.data.channels.push).to.equal(undefined);
    expect(updateGlobalPrefResponse.body.data.channels.chat).to.equal(undefined);
    expect(updateGlobalPrefResponse.body.data.level).to.equal(PreferenceLevelEnum.GLOBAL);

    const getInboxPrefResponse = await session.testAgent
      .get(`/v1/inbox/preferences`)
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const workflowPref = getInboxPrefResponse.body.data.find(
      (pref) => pref.level === PreferenceLevelEnum.TEMPLATE && pref.workflow.id === workflow._id
    );

    expect(getInboxPrefResponse.status).to.equal(200);
    expect(workflowPref.channels.email).to.equal(true);
    expect(workflowPref.channels.in_app).to.equal(false);
    expect(workflowPref.channels.sms).to.equal(undefined);
    expect(workflowPref.channels.push).to.equal(undefined);
    expect(workflowPref.channels.chat).to.equal(undefined);
    expect(workflowPref.level).to.equal(PreferenceLevelEnum.TEMPLATE);
  });
});
