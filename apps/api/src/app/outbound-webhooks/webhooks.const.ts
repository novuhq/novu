import type { Type } from '@nestjs/common';
import {
  InboundEmailWebhookPayloadDto,
  MessageWebhookPayloadDto,
  MessageWebhookPayloadWithErrorDto,
  PreferenceWebhookPayloadDto,
  WorkflowCreatedWebhookPayloadDto,
  WorkflowDeletedWebhookPayloadDto,
  WorkflowPublishedWebhookPayloadDto,
  WorkflowUpdatedWebhookPayloadDto,
} from '@novu/application-generic';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';

export interface WebhookEventConfig {
  event: WebhookEventEnum;
  payloadDto: Type<unknown>;
  objectType: WebhookObjectTypeEnum;
}

type WebhookEventRecord = Record<WebhookEventEnum, WebhookEventConfig>;

// Create the webhook events as a record to ensure all enum values are covered
const webhookEventRecord = {
  [WebhookEventEnum.MESSAGE_SENT]: {
    event: WebhookEventEnum.MESSAGE_SENT,
    payloadDto: MessageWebhookPayloadWithErrorDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_FAILED]: {
    event: WebhookEventEnum.MESSAGE_FAILED,
    payloadDto: MessageWebhookPayloadWithErrorDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_DELIVERED]: {
    event: WebhookEventEnum.MESSAGE_DELIVERED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_SEEN]: {
    event: WebhookEventEnum.MESSAGE_SEEN,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_READ]: {
    event: WebhookEventEnum.MESSAGE_READ,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNREAD]: {
    event: WebhookEventEnum.MESSAGE_UNREAD,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_ARCHIVED]: {
    event: WebhookEventEnum.MESSAGE_ARCHIVED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNARCHIVED]: {
    event: WebhookEventEnum.MESSAGE_UNARCHIVED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_SNOOZED]: {
    event: WebhookEventEnum.MESSAGE_SNOOZED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNSNOOZED]: {
    event: WebhookEventEnum.MESSAGE_UNSNOOZED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_DELETED]: {
    event: WebhookEventEnum.MESSAGE_DELETED,
    payloadDto: MessageWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.WORKFLOW_CREATED]: {
    event: WebhookEventEnum.WORKFLOW_CREATED,
    payloadDto: WorkflowCreatedWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_UPDATED]: {
    event: WebhookEventEnum.WORKFLOW_UPDATED,
    payloadDto: WorkflowUpdatedWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_DELETED]: {
    event: WebhookEventEnum.WORKFLOW_DELETED,
    payloadDto: WorkflowDeletedWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_PUBLISHED]: {
    event: WebhookEventEnum.WORKFLOW_PUBLISHED,
    payloadDto: WorkflowPublishedWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.PREFERENCE_UPDATED]: {
    event: WebhookEventEnum.PREFERENCE_UPDATED,
    payloadDto: PreferenceWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.PREFERENCE,
  },
  [WebhookEventEnum.EMAIL_RECEIVED]: {
    event: WebhookEventEnum.EMAIL_RECEIVED,
    payloadDto: InboundEmailWebhookPayloadDto,
    objectType: WebhookObjectTypeEnum.EMAIL_INBOUND,
  },
} as const satisfies WebhookEventRecord;

// Helper function to ensure all enum values are present exactly once
function createWebhookEvents<T extends WebhookEventRecord>(record: T): WebhookEventConfig[] {
  return Object.values(record);
}

// Export the webhook events array created from the type-safe record
export const webhookEvents = createWebhookEvents(webhookEventRecord);
