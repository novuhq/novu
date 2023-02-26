import * as mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { ExecutionDetailsEntity } from './execution-details.entity';

import { schemaOptions } from '../schema-default.options';

const executionDetailsSchema = new Schema(
  {
    _jobId: {
      type: Schema.Types.String,
      index: true,
    },
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      index: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      ref: 'Notification',
      index: true,
    },
    _notificationTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      index: false,
    },
    _subscriberId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscriber',
      index: false,
    },
    _messageId: {
      type: Schema.Types.String,
      index: false,
    },
    providerId: {
      type: Schema.Types.String,
      index: false,
    },
    transactionId: {
      type: Schema.Types.String,
      index: false,
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

interface IExecutionDetailsDocument extends ExecutionDetailsEntity, Document {
  _id: never;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExecutionDetails =
  mongoose.models.ExecutionDetails ||
  mongoose.model<IExecutionDetailsDocument>('ExecutionDetails', executionDetailsSchema);
