export enum WebhookEventEnum {
  // Workflow
  WORKFLOW_CREATED = 'workflow.created',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_DELETED = 'workflow.deleted',

  // Message
  MESSAGE_SENT = 'message.sent',
  MESSAGE_FAILED = 'message.failed',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_SEEN = 'message.seen',
  MESSAGE_READ = 'message.read',
  MESSAGE_UNREAD = 'message.unread',
  MESSAGE_ARCHIVED = 'message.archived',
  MESSAGE_UNARCHIVED = 'message.unarchived',
  MESSAGE_SNOOZED = 'message.snoozed',
  MESSAGE_UNSNOOZED = 'message.unsnoozed',
}

export enum WebhookObjectTypeEnum {
  WORKFLOW = 'workflow',
  MESSAGE = 'message',
}
