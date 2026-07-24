import type { CardElement } from 'chat';
import type { ToolApprovalCard } from './agent.types';

export function isCardElement(value: object): value is CardElement {
  return 'type' in value && (value as { type: string }).type === 'card';
}

export function isToolApprovalCard(value: unknown): value is ToolApprovalCard {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'tool-approval-card';
}
