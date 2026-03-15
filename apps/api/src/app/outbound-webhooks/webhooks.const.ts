import { ApiProperty } from '@nestjs/swagger';
import { MessageWebhookResponseDto, WorkflowResponseDto } from '@novu/application-generic';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { InboxPreference } from '../inbox/utils/types';

interface WebhookEventConfig {
  event: WebhookEventEnum;
  // biome-ignore lint/complexity/noBannedTypes: <explanation> This is the expected type for the payloadDto for SwaggerDocumentOptions.extraModels
  payloadDto: Function;
  objectType: WebhookObjectTypeEnum;
}

type WebhookEventRecord = Record<WebhookEventEnum, WebhookEventConfig>;

export class WebhookUpdatedWorkflowDto {
  @ApiProperty({ description: 'Current workflow state', type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;

  @ApiProperty({ description: 'Previous state of the workflow', type: () => WorkflowResponseDto })
  previousObject: WorkflowResponseDto;
}

export class WebhookCreatedWorkflowDto {
  @ApiProperty({ description: 'Current workflow state', type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;
}

export class WebhookDeletedWorkflowDto {
  @ApiProperty({ description: 'Current workflow state', type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;
}

export class WebhookMessageDto {
  @ApiProperty({ description: 'Current message state' })
  object: MessageWebhookResponseDto;
}

enum MessageFailedErrorCodeEnum {
  TOKEN_EXPIRED = 'token_expired',
}

export class MessageFailedWebhookDto {
  @ApiProperty({ description: 'Current message state' })
  object: MessageWebhookResponseDto;

  @ApiProperty({ description: 'Error message' })
  errorCode: MessageFailedErrorCodeEnum;
}

export class MessageFailedPushDto {
  @ApiProperty({ description: 'Is invalid token' })
  isInvalidToken: boolean;

  @ApiProperty({ description: 'Device token' })
  deviceToken: string;
}

export class MessageFailedErrorDto {
  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Push error' })
  push?: MessageFailedPushDto;
}

export class WebhookMessageFailedDto {
  @ApiProperty({ description: 'Current message state' })
  object: MessageWebhookResponseDto;

  @ApiProperty({ description: 'Error message' })
  error: MessageFailedErrorDto;
}

export class WebhookPreferenceDto {
  @ApiProperty({ description: 'Current preference state' })
  object: InboxPreference;

  @ApiProperty({ description: 'Subscriber ID' })
  subscriberId: string;
}

// Create the webhook events as a record to ensure all enum values are covered
const webhookEventRecord = {
  [WebhookEventEnum.MESSAGE_SENT]: {
    event: WebhookEventEnum.MESSAGE_SENT,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_FAILED]: {
    event: WebhookEventEnum.MESSAGE_FAILED,
    payloadDto: WebhookMessageFailedDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_DELIVERED]: {
    event: WebhookEventEnum.MESSAGE_DELIVERED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_SEEN]: {
    event: WebhookEventEnum.MESSAGE_SEEN,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_READ]: {
    event: WebhookEventEnum.MESSAGE_READ,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNREAD]: {
    event: WebhookEventEnum.MESSAGE_UNREAD,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_ARCHIVED]: {
    event: WebhookEventEnum.MESSAGE_ARCHIVED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNARCHIVED]: {
    event: WebhookEventEnum.MESSAGE_UNARCHIVED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_SNOOZED]: {
    event: WebhookEventEnum.MESSAGE_SNOOZED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_UNSNOOZED]: {
    event: WebhookEventEnum.MESSAGE_UNSNOOZED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.MESSAGE_DELETED]: {
    event: WebhookEventEnum.MESSAGE_DELETED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  [WebhookEventEnum.WORKFLOW_CREATED]: {
    event: WebhookEventEnum.WORKFLOW_CREATED,
    payloadDto: WebhookCreatedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_UPDATED]: {
    event: WebhookEventEnum.WORKFLOW_UPDATED,
    payloadDto: WebhookUpdatedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_DELETED]: {
    event: WebhookEventEnum.WORKFLOW_DELETED,
    payloadDto: WebhookDeletedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.WORKFLOW_PUBLISHED]: {
    event: WebhookEventEnum.WORKFLOW_PUBLISHED,
    payloadDto: WebhookUpdatedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  [WebhookEventEnum.PREFERENCE_UPDATED]: {
    event: WebhookEventEnum.PREFERENCE_UPDATED,
    payloadDto: WebhookPreferenceDto,
    objectType: WebhookObjectTypeEnum.PREFERENCE,
  },
} as const satisfies WebhookEventRecord;

// Helper function to ensure all enum values are present exactly once
function createWebhookEvents<T extends WebhookEventRecord>(record: T): WebhookEventConfig[] {
  return Object.values(record);
}

// Export the webhook events array created from the type-safe record
export const webhookEvents = createWebhookEvents(webhookEventRecord);
