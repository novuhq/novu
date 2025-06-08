import { ApiProperty } from '@nestjs/swagger';
import { WebhookObjectTypeEnum, WebhookEventEnum } from '@novu/shared';
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

export const webhookEvents = [
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
