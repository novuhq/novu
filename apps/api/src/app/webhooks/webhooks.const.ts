import { WebhookEventEnum, WebhookObjectTypeEnum } from './dtos/webhook-payload.dto';
import { WorkflowResponseDto } from '../workflows-v2/dtos/workflow-response.dto';

export class WebhookUpdatedWorkflowDto {
  object: WorkflowResponseDto;
  previousObject: WorkflowResponseDto;
}

export class WebhookCreatedWorkflowDto {
  object: WorkflowResponseDto;
}

export class WebhookDeletedWorkflowDto {
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
];
