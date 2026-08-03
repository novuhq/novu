/**
 * Origin refs persisted on a workflow agent dispatch seed after a successful
 * agent-assigned chat send. Kept for documentation / shared typing of the join payload.
 */
export type WorkflowAgentDispatchOriginDto = {
  notificationId: string;
  jobId: string;
  messageId: string;
  transactionId: string;
  workflowIdentifier: string;
  stepId?: string;
  subscriberId: string;
};
