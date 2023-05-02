import {
  MessageRepository,
  NotificationRepository,
  ExecutionDetailsRepository,
  JobRepository,
  OrganizationRepository,
  EnvironmentRepository,
  JobStatusEnum,
} from '@novu/dal';
import { addMinutes, addMonths } from 'date-fns';

const messageRepository = new MessageRepository();
const notificationRepository = new NotificationRepository();
const jobRepository = new JobRepository();
const executionDetailsRepository = new ExecutionDetailsRepository();
const organizationRepository = new OrganizationRepository();
const environmentRepository = new EnvironmentRepository();
const now = Date.now();
let expireAtOneMonth = addMonths(now, 1);
let expireAtSixMonths = addMonths(now, 6);

export async function createExpireAt() {
  // eslint-disable-next-line no-console
  console.log('start migration - add expireAt field');

  // eslint-disable-next-line no-console
  console.log('get organizations and its environments');

  const organizations = await organizationRepository.find({});
  for (const organization of organizations) {
    const environments = await environmentRepository.findOrganizationEnvironments(organization._id);
    for (const environment of environments) {
      const query = {
        _organizationId: organization._id,
        _environmentId: environment._id,
        expireAt: { $exists: false },
      };
      expireAtOneMonth = addMinutes(expireAtOneMonth, Math.floor(Math.random() * 4320));
      expireAtSixMonths = addMinutes(expireAtSixMonths, Math.floor(Math.random() * 4320));

      await messagesSetExpireAt(query);
      await notificationExpireAt(query);
    }
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
    { $set: { expireAt: expireAtSixMonths } }
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
