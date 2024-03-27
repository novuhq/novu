import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { JobDBModel, JobStatusEnum } from './job.entity';
import { getTTLOptions } from '../../shared';

const jobSchema = new Schema<JobDBModel>(
  {
    identifier: {
      type: Schema.Types.String,
    },
    status: {
      type: Schema.Types.String,
      default: JobStatusEnum.PENDING,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    overrides: {
      type: Schema.Types.Mixed,
    },
    tenant: {
      type: Schema.Types.Mixed,
    },
    step: {
      type: Schema.Types.Mixed,
    },
    _templateId: {
      type: Schema.Types.String,
      ref: 'NotificationTemplate',
    },
    transactionId: {
      type: Schema.Types.String,
    },
    delay: {
      type: Schema.Types.Number,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
    _mergedDigestId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    subscriberId: {
      type: Schema.Types.String,
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    _userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    error: {
      type: Schema.Types.Mixed,
    },
    digest: {
      events: [Schema.Types.Mixed],
      amount: {
        type: Schema.Types.Number,
      },
      unit: {
        type: Schema.Types.String,
      },
      digestKey: {
        type: Schema.Types.String,
      },
      type: {
        type: Schema.Types.String,
      },
      backoffUnit: {
        type: Schema.Types.String,
      },
      backoffAmount: {
        type: Schema.Types.Number,
      },
      updateMode: {
        type: Schema.Types.Boolean,
      },
      backoff: {
        type: Schema.Types.Boolean,
      },
      timed: {
        atTime: {
          type: Schema.Types.String,
        },
        weekDays: [Schema.Types.String],
        monthDays: [Schema.Types.Number],
        ordinal: {
          type: Schema.Types.String,
        },
        ordinalValue: {
          type: Schema.Types.String,
        },
        monthlyType: {
          type: Schema.Types.String,
        },
      },
    },
    type: {
      type: Schema.Types.String,
    },
    providerId: {
      type: Schema.Types.String,
    },
    _actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    actorId: {
      type: Schema.Types.String,
    },
    expireAt: Schema.Types.Date,
  },
  schemaOptions
);

jobSchema.index({ expireAt: 1 }, getTTLOptions());

jobSchema.virtual('executionDetails', {
  ref: 'ExecutionDetails',
  localField: '_id',
  foreignField: '_jobId',
});

jobSchema.virtual('template', {
  ref: 'NotificationTemplate',
  localField: '_templateId',
  foreignField: '_id',
  justOne: true,
});

jobSchema.virtual('notification', {
  ref: 'Notification',
  localField: '_notificationId',
  foreignField: '_id',
  justOne: true,
});

jobSchema.virtual('subscriber', {
  ref: 'Subscriber',
  localField: '_subscriberId',
  foreignField: '_id',
  justOne: true,
});

jobSchema.virtual('environment', {
  ref: 'Environment',
  localField: '_environmentId',
  foreignField: '_id',
  justOne: true,
});

/*
 * This index was initially created to optimize:
 *
 * Path : apps/api/src/app/events/usecases/send-message/digest/get-digest-events.usecase.ts
 *    Context : filterJobs()
 *       Query : findOne.(
 *          {
 *            transactionId: transactionId,
 *            _subscriberId: currentJob._subscriberId,
 *            _environmentId: currentJob._environmentId,
 *            type: StepTypeEnum.TRIGGER,
 *          },
 *          '_id'
 *        )
 *
 * Path : apps/api/src/app/events/usecases/message-matcher/message-matcher.usecase.ts
 *    Context : processPreviousStep()
 *       Query : findOne({
 *           transactionId: command.transactionId,
 *           _subscriberId: command._subscriberId ? command._subscriberId : command.subscriberId,
 *           _environmentId: command.environmentId,
 *           _organizationId: command.organizationId,
 *           'step.uuid': filter.step,
 *        })
 *
 * Path : apps/api/src/app/events/usecases/trigger-event/trigger-event.usecase.ts
 *    Context : validateTransactionIdProperty()
 *       Query : findOne(
 *          {
 *            transactionId,
 *            _environmentId: environmentId,
 *          },
 *          '_id'
 *        )
 *
 * Path : apps/api/src/app/events/usecases/send-message/digest/digest.usecase.ts
 *    Context : getJobsToUpdate()
 *       Query : find({
 *           transactionId: command.transactionId,
 *           _environmentId: command.environmentId,
 *           _id: {
 *             $ne: command.jobId,
 *           },
 *         })
 *
 * Path : apps/api/src/app/events/usecases/cancel-delayed/cancel-delayed.usecase.ts
 *    Context : execute()
 *       Query : findOne({
 *         transactionId: command.transactionId,
 *         _environmentId: command.environmentId,
 *         status: JobStatusEnum.DELAYED,
 *        })
 *
 * Path : libs/dal/src/repositories/job/job.repository.ts
 *    Context : findOnePopulate()
 *       Query : findOne( { _environmentId: string; transactionId: string })
 *
 */
jobSchema.index({
  transactionId: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path : libs/dal/src/repositories/job/job.repository.ts
 *    Context : execute()
 *       Query : findOne({
 *          _parentId: command.parentId,
 *          _environmentId: command.environmentId,
 *        })
 */
jobSchema.index({
  _parentId: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path : apps/api/src/app/events/usecases/digest-filter-steps/digest-filter-steps-backoff.usecase.ts
 *    Context : getTrigger()
 *       Query : findOne({
 *          _subscriberId: command._subscriberId,
 *          _templateId: command.templateId,
 *          _environmentId: command.environmentId,
 *          status: JobStatusEnum.COMPLETED,
 *          type: StepTypeEnum.TRIGGER,
 *          query['payload.' + digestKey] = DigestFilterSteps.getNestedValue(command.payload, digestKey);
 *          updatedAt: {
 *            $gte: this.getBackoffDate(step),
 *          },
 *        })
 *    Context : alreadyHaveDigest()
 *              type should be after _environmentId
 *       Query : findOne({
 *          _templateId: command.templateId,
 *          _subscriberId: command._subscriberId,
 *          _environmentId: command.environmentId,
 *          type: StepTypeEnum.TRIGGER,
 *          query['payload.' + digestKey] = DigestFilterSteps.getNestedValue(command.payload, digestKey);
 *          updatedAt: {
 *            $gte: this.getBackoffDate(step),
 *          },
 *        })
 *
 * Path: apps/api/src/app/events/usecases/digest-filter-steps/digest-filter-steps-regular.usecase.ts
 *    Context : getDigest()
 *       Query : findOne({
 *         _templateId: command.templateId,
 *         _subscriberId: command._subscriberId,
 *         _environmentId: command.environmentId,
 *         status: JobStatusEnum.DELAYED,
 *         type: StepTypeEnum.DIGEST,
 *          where['payload.' + digestKey] = DigestFilterSteps.getNestedValue(command.payload, digestKey);
 *       })
 *
 * Path : libs/dal/src/repositories/job/job.repository.ts
 *    Context : findJobsToDigest()
 *       Query : find({
 *          _templateId: templateId,
 *          _subscriberId: subscriberId,
 *          $or: [
 *            { status: JobStatusEnum.COMPLETED, type: StepTypeEnum.DIGEST },
 *            { status: JobStatusEnum.DELAYED, type: StepTypeEnum.DELAY },
 *          ],
 *          _environmentId: environmentId,
 *          updatedAt: {
 *            $gte: from,
 *          },
 *        })
 *       Query : find({
 *           updatedAt: {
 *             $gte: from,
 *           },
 *           _templateId: templateId,
 *           status: JobStatusEnum.COMPLETED,
 *           type: StepTypeEnum.TRIGGER,
 *           _environmentId: environmentId,
 *           _subscriberId: subscriberId,
 *           transactionId: {
 *             $nin: transactionIds,
 *           },
 *         })
 *       Query : update({
 *            updatedAt: {
 *              $gte: from,
 *            }
 *    Context : shouldDelayDigestJobOrMerge()
 *       Query : find({
 *          _subscriberId: this.convertStringToObjectId(job._subscriberId),
 *          _templateId: job._templateId,
 *          _environmentId: this.convertStringToObjectId(job._environmentId),
 *          status: JobStatusEnum.DELAYED,
 *          type: StepTypeEnum.DIGEST,
 *          ...(digestKey && { [`payload.${digestKey}`]: digestValue }),
 *        }
 *
 * Path : apps/api/src/app/events/usecases/add-job/add-delay-job.usecase.ts
 *    Context : noExistingDelayedJobForDate()
 *       Query : findOne(
 *          {
 *            status: JobStatusEnum.DELAYED,
 *            type: StepTypeEnum.DELAY,
 *            _subscriberId: data._subscriberId,
 *            _templateId: data._templateId,
 *            _environmentId: data._environmentId,
 *            transactionId: { $ne: data.transactionId },
 *            'step.metadata.type': DelayTypeEnum.SCHEDULED,
 *            'step.metadata.delayPath': currentDelayPath,
 *            [`payload.${currentDelayPath}`]: currentDelayDate,
 *          },
 *          '_subscriberId'
 *       )
 */
jobSchema.index({
  _subscriberId: 1,
  _templateId: 1,
  type: 1,
  status: 1,
  updatedAt: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path : apps/api/src/app/events/usecases/send-message/digest/get-digest-events-backoff.usecase.ts
 *    Context : execute()
 *       Query : find({
 *          _subscriberId: command._subscriberId ? command._subscriberId : command.subscriberId,
 *          _templateId: currentJob._templateId,
 *          _environmentId: command.environmentId,
 *          type: StepTypeEnum.TRIGGER,
 *          status: JobStatusEnum.COMPLETED,
 *          createdAt: {
 *            $gte: currentJob.createdAt,
 *          },
 *        }
 */
jobSchema.index({
  _subscriberId: 1,
  _templateId: 1,
  type: 1,
  status: 1,
  createdAt: 1,
});

/*
 * This index was initially created to optimize:
 *
 *    Context : The reason for this Index is that it used by the activity feed with populate,
 *              Notification scheme virtual localField: '_id', foreignField: '_notificationId', one to many
 */
jobSchema.index({
  _notificationId: 1,
});

jobSchema.index({
  _environmentId: 1,
});

jobSchema.index(
  {
    _mergedDigestId: 1,
  },
  {
    sparse: true,
  }
);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Job = (mongoose.models.Job as mongoose.Model<JobDBModel>) || mongoose.model<JobDBModel>('Job', jobSchema);
