import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { JobEntity } from './job.entity';

const jobSchema = new Schema(
  {
    identifier: {
      type: Schema.Types.String,
    },
    status: {
      type: Schema.Types.String,
      default: 'pending',
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    step: {
      type: Schema.Types.Mixed,
    },
    _templateId: {
      type: Schema.Types.String,
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
    },
  },
  schemaOptions
);

interface IJobDocument extends JobEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Job = mongoose.models.Job || mongoose.model<IJobDocument>('Job', jobSchema);
