import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { ExecutionDetailsDBModel } from './execution-details.entity';

import { schemaOptions } from '../schema-default.options';

const executionDetailsSchema = new Schema<ExecutionDetailsDBModel>(
  {
    _jobId: {
      type: Schema.Types.String,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
    },
    _notificationTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
    },
    _messageId: {
      type: Schema.Types.String,
    },
    providerId: {
      type: Schema.Types.String,
    },
    transactionId: {
      type: Schema.Types.String,
    },
    channel: {
      type: Schema.Types.String,
    },
    detail: {
      type: Schema.Types.String,
    },
    source: {
      type: Schema.Types.String,
      default: ExecutionDetailsSourceEnum.CREDENTIALS,
    },
    status: {
      type: Schema.Types.String,
      default: ExecutionDetailsStatusEnum.PENDING,
    },
    isTest: {
      type: Schema.Types.Boolean,
    },
    isRetry: {
      type: Schema.Types.Boolean,
    },
    raw: {
      type: Schema.Types.String,
    },
    webhookStatus: {
      type: Schema.Types.String,
    },
  },
  schemaOptions
);

/*
 * This index was initially created to optimize:
 * message matcher use case
 */
executionDetailsSchema.index({
  _messageId: 1,
  _jobId: 1,
  _environmentId: 1,
  webhookStatus: 1,
});

/*
 * This index was initially created to optimize:
 * get execution details use case
 */
executionDetailsSchema.index({
  _notificationId: 1,
  _environmentId: 1,
  _subscriberId: 1,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExecutionDetails =
  (mongoose.models.ExecutionDetails as mongoose.Model<ExecutionDetailsDBModel>) ||
  mongoose.model<ExecutionDetailsDBModel>('ExecutionDetails', executionDetailsSchema);
