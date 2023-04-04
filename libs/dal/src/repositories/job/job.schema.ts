import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';

import { schemaOptions } from '../schema-default.options';
import { JobDBModel, JobStatusEnum } from './job.entity';

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
  },
  schemaOptions
);

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
 * apps/api/src/app/events/usecases/add-job/add-delay-job.usecase.ts
 */
jobSchema.index({
  _subscriberId: 1,
  _templateId: 1,
  status: 1,
  type: 1,
  transactionId: 1,
});

/*
 * This index was initially created to optimize:
 * apps/api/src/app/events/usecases/send-message/digest/get-digest-events.usecase.ts
 * apps/api/src/app/events/usecases/message-matcher/message-matcher.usecase.ts
 */
jobSchema.index({
  transactionId: 1,
  _subscriberId: 1,
});

/*
 * This index was initially created to optimize:
 * apps/api/src/app/events/usecases/trigger-event/trigger-event.usecase.ts
 * repo
 * apps/api/src/app/events/usecases/send-message/digest/digest.usecase.ts * _id is the last on because it is used with $ne which means it is a range operator
 * apps/api/src/app/events/usecases/cancel-delayed/cancel-delayed.usecase.ts * but OMIT 'status'
 */
jobSchema.index({
  transactionId: 1,
  _environmentId: 1,
  _id: 1,
});

/*
 * This index was initially created to optimize:
 * apps/api/src/app/events/usecases/queue-next-job/queue-next-job.usecase.ts
 */
jobSchema.index({
  _parentId: 1,
  _environmentId: 1,
});

/*
 * This index was initially created to optimize:
 * apps/api/src/app/events/usecases/send-message/digest/get-digest-events-backoff.usecase.ts * updatedAt should be first range operator
 * repo
 * repo
 * repo
 * repo
 * apps/api/src/app/events/usecases/digest-filter-steps/digest-filter-steps-backoff.usecase.ts
 * apps/api/src/app/events/usecases/digest-filter-steps/digest-filter-steps-backoff.usecase.ts * type should be after _environmentId
 * apps/api/src/app/events/usecases/digest-filter-steps/digest-filter-steps-regular.usecase.ts
 */
jobSchema.index({
  _templateId: 1,
  _subscriberId: 1,
  _environmentId: 1,
  type: 1,
  status: 1,
  updatedAt: 1,
  transactionId: 1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Job = (mongoose.models.Job as mongoose.Model<JobDBModel>) || mongoose.model<JobDBModel>('Job', jobSchema);
