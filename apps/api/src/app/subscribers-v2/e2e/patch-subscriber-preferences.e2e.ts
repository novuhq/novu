import { Novu } from '@novu/api';
import {
  BulkUpdateSubscriberPreferencesDto,
  PatchSubscriberPreferencesDto,
  SubscriberResponseDto,
} from '@novu/api/models/components';
import { NotificationTemplateEntity } from '@novu/dal';
import { ShortIsPrefixEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { buildSlug } from '../../shared/helpers/build-slug';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdk,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

let session: UserSession;

describe('Patch Subscriber Preferences - /subscribers/:subscriberId/preferences (PATCH) #novu-v2', () => {
  let novuClient: Novu;
  let subscriber: SubscriberResponseDto;
  let workflow: NotificationTemplateEntity;

  beforeEach(async () => {
    const uuid = randomBytes(4).toString('hex');
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    subscriber = await createSubscriberAndValidate(uuid);
    workflow = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should patch workflow channel preferences', async () => {
    // Patch with workflow id
    const workflowId = workflow._id;
    const patchWithWorkflowId: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
        inApp: true,
      },
      workflowId,
    };

    const responseOne = await novuClient.subscribers.preferences.update(patchWithWorkflowId, subscriber.subscriberId);
    const { global, workflows: workflowsOne } = responseOne.result;

    expect(global.channels).to.deep.equal({ inApp: true, email: true });
    expect(workflowsOne).to.have.lengthOf(1);
    expect(workflowsOne[0].channels).to.deep.equal({ inApp: true, email: false });
    expect(workflowsOne[0].workflow).to.deep.include({
      name: workflow.name,
      identifier: workflow.triggers[0].identifier,
    });

    // Patch with trigger identifier
    const triggerIdentifier = workflow.triggers[0].identifier;
    const patchWithTriggerIdentifier: PatchSubscriberPreferencesDto = {
      channels: {
        email: true,
        inApp: false,
      },
      workflowId: triggerIdentifier,
    };

    const responseTwo = await novuClient.subscribers.preferences.update(
      patchWithTriggerIdentifier,
      subscriber.subscriberId
    );
    const { workflows: workflowsTwo } = responseTwo.result;

    expect(workflowsTwo[0].channels).to.deep.equal({ inApp: false, email: true });

    // Patch with slug
    const slug = buildSlug(workflow.name, ShortIsPrefixEnum.WORKFLOW, workflow._id);
    const patchData: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
        inApp: true,
      },
      workflowId: slug,
    };

    const response = await novuClient.subscribers.preferences.update(patchData, subscriber.subscriberId);
    const { workflows: workflowsThree } = response.result;

    expect(workflowsThree[0].channels).to.deep.equal({ inApp: true, email: false });
  });

  it('should patch global channel preferences', async () => {
    const patchData: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
        inApp: false,
      },
    };

    const response = await novuClient.subscribers.preferences.update(patchData, subscriber.subscriberId);

    const { global, workflows } = response.result;

    expect(global.channels).to.deep.equal({ inApp: false, email: false });
    expect(workflows).to.have.lengthOf(1);
    expect(workflows[0].channels).to.deep.equal({ inApp: false, email: false });
    expect(workflows[0].workflow).to.deep.include({ name: workflow.name, identifier: workflow.triggers[0].identifier });
  });

  it('should return 404 when patching non-existent subscriber preferences', async () => {
    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const patchData: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
      },
    };

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.update(patchData, invalidSubscriberId)
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 400 when patching with invalid workflow id', async () => {
    const patchData: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
      },
      workflowId: 'invalid-workflow-id',
    };

    try {
      await expectSdkValidationExceptionGeneric(() =>
        novuClient.subscribers.preferences.update(patchData, subscriber.subscriberId)
      );
    } catch (e) {
      // TODO: fix in SDK util
      expect(e).to.be.an.instanceOf(Error);
    }
  });

  it('should bulk update multiple workflow preferences', async () => {
    const workflow2 = await session.createTemplate({
      noFeedId: true,
    });
    const workflow3 = await session.createTemplate({
      noFeedId: true,
    });

    const bulkUpdateData: BulkUpdateSubscriberPreferencesDto = {
      preferences: [
        {
          workflowId: workflow._id,
          channels: {
            email: false,
            inApp: true,
            sms: false,
          },
        },
        {
          workflowId: workflow2._id,
          channels: {
            email: true,
            inApp: false,
            push: true,
          },
        },
        {
          workflowId: workflow3.triggers[0].identifier, // Test with trigger identifier
          channels: {
            email: false,
            inApp: true,
            chat: true,
          },
        },
      ],
    };

    const response = await novuClient.subscribers.preferences.bulkUpdate(bulkUpdateData, subscriber.subscriberId);

    expect(response.result).to.be.an('array');
    expect(response.result).to.have.lengthOf(3);

    // Verify each preference was updated correctly
    const preferences = response.result;

    const pref1 = preferences.find((p) => p.workflow?.id === workflow._id);
    expect(pref1).to.exist;
    expect(pref1?.channels.email).to.equal(false);
    expect(pref1?.channels.inApp).to.equal(true);

    const pref2 = preferences.find((p) => p.workflow?.id === workflow2._id);
    expect(pref2).to.exist;
    expect(pref2?.channels.email).to.equal(true);
    expect(pref2?.channels.inApp).to.equal(false);

    const pref3 = preferences.find((p) => p.workflow?.id === workflow3._id);
    expect(pref3).to.exist;
    expect(pref3?.channels.email).to.equal(false);
    expect(pref3?.channels.inApp).to.equal(true);
  });

  it('should return 422 when bulk updating with more than 100 preferences', async () => {
    const preferences = Array.from({ length: 101 }, (_, i) => ({
      workflowId: workflow._id,
      channels: {
        email: i % 2 === 0,
      },
    }));

    const bulkUpdateData = { preferences };

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.subscribers.preferences.bulkUpdate(bulkUpdateData, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(422);
    expect(error?.message).to.include('Validation Error');
  });

  it('should return 404 when bulk updating preferences for non-existent subscriber', async () => {
    const invalidSubscriberId = `non-existent-${randomBytes(2).toString('hex')}`;
    const bulkUpdateData = {
      preferences: [
        {
          workflowId: workflow._id,
          channels: {
            email: false,
          },
        },
      ],
    };

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.bulkUpdate(bulkUpdateData, invalidSubscriberId)
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should return 404 when bulk updating with non-existent workflow ids', async () => {
    const bulkUpdateData = {
      preferences: [
        {
          workflowId: 'non-existent-workflow-id',
          channels: {
            email: false,
          },
        },
      ],
    };

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.subscribers.preferences.bulkUpdate(bulkUpdateData, subscriber.subscriberId)
    );

    expect(error?.statusCode).to.equal(404);
    expect(error?.message).to.include('Workflows with ids: non-existent-workflow-id not found');
  });
});

async function createSubscriberAndValidate(id: string = '') {
  const payload = {
    subscriberId: `test-subscriber-${id}`,
    firstName: `Test ${id}`,
    lastName: 'Subscriber',
    email: `test-${id}@subscriber.com`,
    phone: '+1234567890',
  };

  const res = await session.testAgent.post(`/v1/subscribers`).send(payload);
  expect(res.status).to.equal(201);

  const subscriber = res.body.data;

  expect(subscriber.subscriberId).to.equal(payload.subscriberId);
  expect(subscriber.firstName).to.equal(payload.firstName);
  expect(subscriber.lastName).to.equal(payload.lastName);
  expect(subscriber.email).to.equal(payload.email);
  expect(subscriber.phone).to.equal(payload.phone);

  return subscriber;
}
