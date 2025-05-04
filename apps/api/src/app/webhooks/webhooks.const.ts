import { WebhookEventEnum, WebhookObjectTypeEnum } from './dtos/webhook-payload.dto';
import { WorkflowResponseDto } from '../workflows-v2/dtos/workflow-response.dto';

export const webhookEvents = [
  {
    event: WebhookEventEnum.WORKFLOW_UPDATED,
    payloadDto: WorkflowResponseDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  {
    event: WebhookEventEnum.WORKFLOW_CREATED,
    payloadDto: WorkflowResponseDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  {
    event: WebhookEventEnum.WORKFLOW_DELETED,
    payloadDto: WorkflowResponseDto,
    objectType: WebhookObjectTypeEnum.WORKFLOW,
  },
  // Add other webhook events here as needed
];
