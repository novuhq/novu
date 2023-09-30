import * as mongoose from 'mongoose';
import { Schema } from 'mongoose';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { ExecutionDetailsDBModel } from './execution-details.entity';

import { schemaOptions } from '../schema-default.options';
import { getTTLOptions } from '../../shared';

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
    expireAt: Schema.Types.Date,
  },
  schemaOptions
);

/*
 * This index was initially created to optimize:
 *
 * Path : libs/dal/src/repositories/job/job.schema.ts
 *    Context : The _jobId is here because of JobSchema
 *                                            ref: 'ExecutionDetails',
 *                                            foreignField: '_jobId',
 *
 *
 *  Path : apps/api/src/app/events/usecases/message-matcher/message-matcher.usecase.ts
 *    Context : processPreviousStep
 *    Query : count({
 *      _jobId: command.job._parentId,
 *      _messageId: message._id,
 *      _environmentId: command.environmentId,
 *      webhookStatus: EmailEventStatusEnum.OPENED,
 *    });
 */
executionDetailsSchema.index({
  _jobId: 1,
});

/*
 * This index was initially created to optimize:
 *
 * Path : apps/api/src/app/execution-details/usecases/get-execution-details/get-execution-details.usecase.ts
 *    Context : execute()
 *        Query : find({
 *         _notificationId: command.notificationId,
 *         _environmentId: command.environmentId,
 *         _subscriberId: command.subscriberId,
 *      });
 */
executionDetailsSchema.index({
  _notificationId: 1,
});

executionDetailsSchema.index({
  _environmentId: 1,
});

executionDetailsSchema.index({ expireAt: 1 }, getTTLOptions());

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ExecutionDetails =
  (mongoose.models.ExecutionDetails as mongoose.Model<ExecutionDetailsDBModel>) ||
  mongoose.model<ExecutionDetailsDBModel>('ExecutionDetails', executionDetailsSchema);
