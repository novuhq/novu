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
 * Type guard: narrows `notification.payload` to the workflow's schema type when the
 * notification's `workflowId` (slug) matches `workflow.id`.
 *
 * Only serves code-first authors who have a `Workflow<T>` object in scope.
 */
export function isFromWorkflow<T extends Record<string, unknown>>(
  notification: AgentNotification | null | undefined,
  workflow: Workflow<T>
): notification is AgentNotification<T> {
  return notification?.workflowId === workflow.id;
}
