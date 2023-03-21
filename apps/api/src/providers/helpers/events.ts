import { MessageEntity, SubscriberEntity } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';
import { expect } from 'chai';
import { isSameDay } from 'date-fns';

import { MAILTRAP_EMAIL, TEMPLATE_IDENTIFIER } from './constants';
import { buildIdentifier } from './notification-templates';

export const createSubscriber = async (session: UserSession): Promise<SubscriberEntity> => {
  const _environmentId = session.environment._id;
  const _organizationId = session.organization._id;
  const subscriberService = new SubscribersService(_organizationId, _environmentId);

  const createSubscriberPayload = {
    _environmentId,
    _organizationId,
    channels: [],
    email: MAILTRAP_EMAIL,
    firstName: 'Regression',
    lastName: 'Subscriber',
    phone: '+447070888999',
  } satisfies Omit<SubscriberEntity, '_id' | 'subscriberId' | 'deleted' | 'createdAt' | 'updatedAt'>;

  const subscriber = await subscriberService.createSubscriber(createSubscriberPayload);

  expect(subscriber).to.deep.include({
    _environmentId,
    _organizationId,
    channels: [],
    deleted: false,
    email: MAILTRAP_EMAIL,
    firstName: 'Regression',
    lastName: 'Subscriber',
    phone: '+447070888999',
  });

  expect(subscriber.subscriberId).to.be.ok;
  expect(isSameDay(new Date(subscriber.createdAt as string), new Date()));
  expect(isSameDay(new Date(subscriber.updatedAt as string), new Date()));

  return subscriber;
};

export const triggerEvent = async (
  session: UserSession,
  providerId: EmailProviderIdEnum,
  subscriberId: string,
  overrides?: Record<string, unknown>
): Promise<Record<string, string>> => {
  const response = await session.testAgent.post('/v1/events/trigger').send({
    name: buildIdentifier(providerId),
    to: subscriberId,
    payload: {},
    overrides,
  });

  expect(response.status).to.eql(201);
  expect(response.body.data).to.be.ok;

  return response.body.data;
};
