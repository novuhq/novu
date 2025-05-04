import { ApiProperty } from '@nestjs/swagger';
import { WorkflowResponseDto } from '../../workflows-v2/dtos/workflow-response.dto';

enum WebhookEventEnum {
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_DELETED = 'workflow.deleted',
}

enum WebhookObjectTypeEnum {
  WORKFLOW = 'workflow',
}

export class WrapperDto<T> {
  @ApiProperty({
    description: 'The type of the webhook',
    enum: WebhookEventEnum,
  })
  type: WebhookEventEnum;

  @ApiProperty({
    description: 'The payload of the webhook',
    type: 'object',
  })
  data: T;

  @ApiProperty({
    description: 'The timestamp of the webhook',
    type: 'string',
  })
  timestamp: string;

  @ApiProperty({
    description: 'The environment connected to the webhook',
    type: 'string',
  })
  environmentId: string;

  @ApiProperty({
    description: 'The object of the webhook',
    enum: WebhookObjectTypeEnum,
  })
  object: WebhookObjectTypeEnum;
}

export class WorkflowUpdatedWebhookDto extends WrapperDto<WorkflowResponseDto> {
  type: WebhookEventEnum.WORKFLOW_UPDATED;
  object: WebhookObjectTypeEnum.WORKFLOW;
}

export class WorkflowCreatedWebhookDto extends WrapperDto<WorkflowResponseDto> {
  type: WebhookEventEnum.WORKFLOW_CREATED;
  object: WebhookObjectTypeEnum.WORKFLOW;
}

export class WorkflowDeletedWebhookDto extends WrapperDto<WorkflowResponseDto> {
  type: WebhookEventEnum.WORKFLOW_DELETED;
  object: WebhookObjectTypeEnum.WORKFLOW;
}
