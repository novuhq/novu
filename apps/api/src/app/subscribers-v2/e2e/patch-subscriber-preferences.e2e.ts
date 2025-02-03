import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { UserSession } from '@novu/testing';
import { NotificationTemplateEntity } from '@novu/dal';
import { SubscriberResponseDto, PatchSubscriberPreferencesDto } from '@novu/api/models/components';
import { Novu } from '@novu/api';
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
    const workflowId = workflow._id;

    const patchData: PatchSubscriberPreferencesDto = {
      channels: {
        email: false,
        inApp: true,
      },
      workflowId,
    };

    const response = await novuClient.subscribers.preferences.update(patchData, subscriber.subscriberId);

    const { global, workflows } = response.result;

    expect(global.channels).to.deep.equal({ inApp: true, email: true });
    expect(workflows).to.have.lengthOf(1);
    expect(workflows[0].channels).to.deep.equal({ inApp: true, email: false });
    expect(workflows[0].workflow).to.deep.include({ name: workflow.name, identifier: workflow.triggers[0].identifier });
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
