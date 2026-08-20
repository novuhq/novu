import type { CardElement } from 'chat';
import type { Workflow } from '../../types/discover.types';
import type { AgentNotification, ToolApprovalCard } from './agent.types';

export function isCardElement(value: object): value is CardElement {
  return 'type' in value && (value as { type: string }).type === 'card';
}

export function isToolApprovalCard(value: unknown): value is ToolApprovalCard {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'tool-approval-card';
}

/**
 * Narrows `notification.payload` to the workflow's schema when `workflowId` matches `workflow.id`.
 */
export function isFromWorkflow<T extends Record<string, unknown>>(
  notification: AgentNotification | null | undefined,
  workflow: Workflow<T>
): notification is AgentNotification<T> {
  return notification?.workflowId === workflow.id;
}
