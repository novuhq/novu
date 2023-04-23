import {
  MessageRepository,
  NotificationRepository,
  ExecutionDetailsRepository,
  JobRepository,
  OrganizationRepository,
  EnvironmentRepository,
  JobStatusEnum,
} from '@novu/dal';
import { addMilliseconds, addMonths } from 'date-fns';
import { StepTypeEnum } from '@novu/shared';
import { CalculateDelayService } from '@novu/application-generic';

const messageRepository = new MessageRepository();
const notificationRepository = new NotificationRepository();
const jobRepository = new JobRepository();
const executionDetailsRepository = new ExecutionDetailsRepository();
const organizationRepository = new OrganizationRepository();
const environmentRepository = new EnvironmentRepository();
const now = Date.now();
const expireAtOneMonth = addMonths(now, 1);
const expireAtSixMonths = addMonths(now, 6);
const calculateDelayService = new CalculateDelayService();

export async function createExpireAt() {
  // eslint-disable-next-line no-console
  console.log('start migration - add expireAt field');

  // eslint-disable-next-line no-console
  console.log('get organizations and its environments');

  const organizations = await organizationRepository.find({});
  for (const organization of organizations) {
    const environments = await environmentRepository.findOrganizationEnvironments(organization._id);
    for (const environment of environments) {
      console.log(environment.name);
      const query = {
        _organizationId: organization._id,
        _environmentId: environment._id,
        expireAt: { $exists: false },
      };
      await messagesExpireAt(query);
      await notificationExpireAt(query);
    }
  }

  // eslint-disable-next-line no-console
  console.log('add in_app messages as seen');

  await inAppAsSeen();

  // eslint-disable-next-line no-console
  console.log('add not in_app messages as unseen (due the missing feature seen/unseen on other channels)');

  await notInAppAsUnseen();

  // eslint-disable-next-line no-console
  console.log('end migration');
}

export async function messagesExpireAt(query) {
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
// const notifications = notificationRepository.find({ expireAt: { $exists: false } });

// await notificationRepository.update({ expireAt: { $exists: false } }, { $set: { expireAt: expireAt } });
function getCount() {
  return 1;
}
export async function notificationExpireAt(query) {
  // const notification = await notificationRepository.findOne(query);

  /*
   * const pop = await notificationRepository._model.findOne(query).populate({
   *   path: 'jobs',
   *   match: { type: { $in: [StepTypeEnum.DELAY, StepTypeEnum.DIGEST] }, status: JobStatusEnum.DELAYED },
   * });
   * console.log(notification);
   */

  // console.log(pop);

  /*
   * const jobsnnn = await jobRepository.find(
   *   {
   *     ...query,
   *     type: { $in: [StepTypeEnum.DELAY, StepTypeEnum.DIGEST] },
   *     status: { $in: [JobStatusEnum.DELAYED, JobStatusEnum.PENDING] },
   *   },
   *   function (err, job) {
   *     if (err) {
   *       console.log('lll');
   *     }
   *     console.log('kk', job._id);
   *   }
   * );
   * console.log(jobsnnn);
   */
  const jobs = await jobRepository.find({
    ...query,
    type: { $in: [StepTypeEnum.DELAY, StepTypeEnum.DIGEST] },
    status: { $in: [JobStatusEnum.DELAYED, JobStatusEnum.PENDING] },
  });
  console.log(jobs);

  /*
   * if (job) {
   *   // console.log(calculateDelayService.calculateDelay(job.step, job.payload, job.overrides));
   * }
   */

  const acc = jobs.map((job) => {
    return {
      notificationId: job._notificationId,
      delay: calculateDelayService.calculateDelay(job.step, job.payload, job.overrides),
    };
  });
  console.log(acc);
  const red = acc.reduce<{ notificationId: string; delay: number }[]>((res, rec) => {
    const found = res.findIndex((temp) => temp?.notificationId === rec.notificationId);
    console.log(found);
    if (found >= 0) {
      res[found] = { notificationId: rec.notificationId, delay: res[found].delay + rec.delay };
      console.log(res);

      return res;
    }

    return [...res, rec];
  }, []);

  console.log('red', red);

  const red2 = red.reduce((res, rec) => {
    return { ...res, [rec.notificationId]: rec.delay };
  }, {});

  console.log('2', red2);

  // console.log(acc);
  const count = await jobRepository.aggregate([
    {
      $match: {
        expireAt: { $exists: false },
        type: { $in: [StepTypeEnum.DELAY, StepTypeEnum.DIGEST] },
        status: { $in: [JobStatusEnum.DELAYED, JobStatusEnum.PENDING] },
        // status: JobStatusEnum.DELAYED,
      },
    },
    /*
     * {
     *   $group: {
     *     _id: '$_notificationId',
     *     // step: '$step',
     *
     *     // delay: { $sum: calculateDelayService.calculateDelay('$digest', '$payload', '$overrides') },
     *   },
     * },
     */
    { $group: { _id: '$_notificationId', delay: { $sum: '$digest.amount' } } },
  ]);

  // console.log(count);
  const agg = await jobRepository.aggregate([
    { $match: { ...query, type: { $in: [StepTypeEnum.DELAY, StepTypeEnum.DIGEST] }, status: JobStatusEnum.DELAYED } },
    { $group: { _id: null, delay: { $sum: 1 } } },
  ]);

  console.log('aggggg', count);

  const arr = red.map((noti) => noti.notificationId);

  // await notificationRepository.update({ ...query, _id: { $in: arr } }, { $set: { expireAt: addMilliseconds(now) } });
  await notificationRepository.update({ ...query, _id: { $in: arr } }, { $set: { expireAt: expireAtOneMonth } });

  await jobRepository.update(query, { $set: { expireAt: expireAtOneMonth } });
  await executionDetailsRepository.update(query, { $set: { expireAt: expireAtOneMonth } });
}

// const notifications = notificationRepository.find({ expireAt: { $exists: false } });

// await notificationRepository.update({ expireAt: { $exists: false } }, { $set: { expireAt: expireAt } });

export async function inAppAsSeen() {
  /*
   * await messageRepository.update(
   *   {
   *     channel: 'in_app',
   *     seen: { $exists: false },
   *   },
   *   { $set: { seen: true } }
   * );
   */
}

export async function notInAppAsUnseen() {
  /*
   * await messageRepository.update(
   *   {
   *     channel: { $ne: 'in_app' },
   *     seen: { $exists: false },
   *   },
   *   { $set: { seen: false } }
   * );
   */
}
