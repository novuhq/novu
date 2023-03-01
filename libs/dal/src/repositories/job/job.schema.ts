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
      index: true,
    },
    transactionId: {
      type: Schema.Types.String,
      index: true,
    },
    delay: {
      type: Schema.Types.Number,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      index: true,
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: true,
    },
    _userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      index: true,
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
      index: true,
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Job = (mongoose.models.Job as mongoose.Model<JobDBModel>) || mongoose.model<JobDBModel>('Job', jobSchema);
