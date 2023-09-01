import '../../src/config';
import {
  MessageRepository,
  NotificationRepository,
  ExecutionDetailsRepository,
  JobRepository,
  OrganizationRepository,
  EnvironmentRepository,
  JobStatusEnum,
} from '@novu/dal';
import { addMinutes, addDays } from 'date-fns';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';

const messageRepository = new MessageRepository();
const notificationRepository = new NotificationRepository();
const jobRepository = new JobRepository();
const executionDetailsRepository = new ExecutionDetailsRepository();
const organizationRepository = new OrganizationRepository();
const environmentRepository = new EnvironmentRepository();
const now = Date.now();
let expireAtOneMonth = addDays(now, 30);
let expireAtOneYear = addDays(now, 365);

export async function createExpireAt() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  // eslint-disable-next-line no-console
  console.log('start migration - add expireAt field');

  // eslint-disable-next-line no-console
  console.log('get organizations and its environments');

  const organizations = await organizationRepository.find({});
  const totalOrganizations = organizations.length;
  let currentOrganization = 0;
  for (const organization of organizations) {
    currentOrganization += 1;
    console.log(`organization ${currentOrganization} of ${totalOrganizations}`);

    const environments = await environmentRepository.findOrganizationEnvironments(organization._id);
    for (const environment of environments) {
      const query = {
        _organizationId: organization._id,
        _environmentId: environment._id,
        expireAt: { $exists: false },
      };
      expireAtOneMonth = addMinutes(expireAtOneMonth, Math.floor(Math.random() * 4320));
      expireAtOneYear = addMinutes(expireAtOneYear, Math.floor(Math.random() * 4320));

      console.log('Setting messages');
      await messagesSetExpireAt(query);
      console.log('Setting notifications');
      await notificationExpireAt(query);
    }

    console.log('Prococessed organization' + organization._id);
  }

  // eslint-disable-next-line no-console
  console.log('end migration');
}

export async function messagesSetExpireAt(query) {
  await messageRepository.update(
    {
      ...query,
      channel: { $ne: 'in_app' },
    },
    { $set: { expireAt: expireAtOneMonth } }
  );

  await messageRepository.update(
    {
      ...query,
      channel: 'in_app',
    },
    { $set: { expireAt: expireAtOneYear } }
  );
}

export async function notificationExpireAt(query) {
  const excludedIds = await getExcludedNotificationIds(query);

  await notificationRepository.update(
    { ...query, _id: { $nin: excludedIds } },
    { $set: { expireAt: expireAtOneMonth } }
  );

  await jobRepository.update(
    { ...query, _notificationId: { $nin: excludedIds } },
    { $set: { expireAt: expireAtOneMonth } }
  );

  await executionDetailsRepository.update(
    { ...query, _notificationId: { $nin: excludedIds } },
    { $set: { expireAt: expireAtOneMonth } }
  );
}

export async function getExcludedNotificationIds(query) {
  const pendingNotifications = await jobRepository._model
    .distinct('_notificationId', {
      ...query,
      status: JobStatusEnum.PENDING,
    })
    .read('secondaryPreferred');

  // digested events stays pending, leaving the notification and deleting the actually digested could cause errors
  return await notificationRepository._model
    .distinct('_id', {
      ...query,
      _id: { $in: pendingNotifications },
      _digestedNotificationId: { $exists: false, $eq: null },
    })
    .read('secondaryPreferred');
}

createExpireAt();
