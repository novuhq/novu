export enum WebhookEventEnum {
  // Workflow
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_DELETED = 'workflow.deleted',

  // Message
  MESSAGE_SENT = 'message.sent',
  MESSAGE_FAILED = 'message.failed',
  MESSAGE_DELIVERED = 'message.delivered',
}

export enum WebhookObjectTypeEnum {
  WORKFLOW = 'workflow',
  MESSAGE = 'message',
}
