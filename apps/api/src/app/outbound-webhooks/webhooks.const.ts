import { ApiProperty } from '@nestjs/swagger';
import { MessageWebhookResponseDto } from '@novu/application-generic';
import { WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { WorkflowResponseDto } from '../workflows-v2/dtos/workflow-response.dto';

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

export class WebhookMessageFailedDto {
  @ApiProperty({ description: 'Current message state' })
  object: MessageWebhookResponseDto;

  @ApiProperty({ description: 'Error message' })
  error: {
    message: string;
  };
}

export const webhookEvents = [
  {
    event: WebhookEventEnum.MESSAGE_SENT,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  {
    event: WebhookEventEnum.MESSAGE_FAILED,
    payloadDto: WebhookMessageFailedDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  {
    event: WebhookEventEnum.MESSAGE_DELIVERED,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  {
    event: WebhookEventEnum.MESSAGE_SEEN,
    payloadDto: WebhookMessageDto,
    objectType: WebhookObjectTypeEnum.MESSAGE,
  },
  {
    event: WebhookEventEnum.WORKFLOW_UPDATED,
    payloadDto: WebhookUpdatedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  {
    event: WebhookEventEnum.WORKFLOW_CREATED,
    payloadDto: WebhookCreatedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  {
    event: WebhookEventEnum.WORKFLOW_DELETED,
    payloadDto: WebhookDeletedWorkflowDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
] as const;
