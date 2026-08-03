import mongoose, { Schema } from 'mongoose';
import { schemaOptions } from '../schema-default.options';
import { WorkflowAgentDispatchDBModel } from './workflow-agent-dispatch.entity';

const workflowAgentDispatchSchema = new Schema<WorkflowAgentDispatchDBModel>(
  {
    _environmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Environment',
      required: true,
    },
    _organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    _agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    _integrationId: {
      type: Schema.Types.ObjectId,
      ref: 'Integration',
      required: true,
    },
    platform: {
      type: Schema.Types.String,
      required: true,
    },
    platformThreadId: {
      type: Schema.Types.String,
      required: true,
    },
    platformMessageId: {
      type: Schema.Types.String,
      required: true,
    },
    _notificationId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    _jobId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    _messageId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    transactionId: {
      type: Schema.Types.String,
      required: true,
    },
    workflowIdentifier: {
      type: Schema.Types.String,
      required: true,
    },
    stepId: {
      type: Schema.Types.String,
      required: false,
    },
    subscriberId: {
      type: Schema.Types.String,
      required: true,
    },
  },
  schemaOptions
);

workflowAgentDispatchSchema.index(
  {
    _environmentId: 1,
    _agentId: 1,
    _integrationId: 1,
    platformThreadId: 1,
  },
  { unique: true }
);

export const WorkflowAgentDispatch =
  (mongoose.models.WorkflowAgentDispatch as mongoose.Model<WorkflowAgentDispatchDBModel>) ||
  mongoose.model<WorkflowAgentDispatchDBModel>('WorkflowAgentDispatch', workflowAgentDispatchSchema);
