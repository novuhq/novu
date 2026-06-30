import type { CardElement } from '../../../cards';
import { Actions, Button, Card, CardText } from '../../../cards';
import type { AgentToolCall } from '../agent.types';
import { type ApprovalPayload, parseApprovalActionId } from './action-id';

function summarise(toolCall: AgentToolCall): string {
  const first = toolCall.input ? Object.values(toolCall.input)[0] : undefined;
  if (first === undefined) return toolCall.name;
  const text = typeof first === 'string' ? first : JSON.stringify(first);

  return `${toolCall.name}: ${text.length > 80 ? `${text.slice(0, 77)}...` : text}`;
}

export function defaultApprovalCard(params: { toolCall: AgentToolCall; actionIds: { approve: string; deny: string } }) {
  return Card({
    title: 'Tool approval required',
    subtitle: summarise(params.toolCall),
    children: [
      Actions({
        children: [
          Button({ id: params.actionIds.deny, label: 'Deny' }),
          Button({ id: params.actionIds.approve, label: 'Approve', style: 'primary' }),
        ],
      }),
    ],
  });
}

export function resolvedApprovalCard(params: { name: string; approved: boolean }) {
  return Card({
    title: params.approved ? 'Approved' : 'Denied',
    subtitle: params.name,
    children: [CardText(params.approved ? `Ran ${params.name}.` : `Skipped ${params.name}.`)],
  });
}

/** Walk a serialized card element tree and return the first approval payload found on any button id. */
export function findApprovalPayloadInCard(card: CardElement | undefined): ApprovalPayload | null {
  if (!card) return null;

  const stack: Array<{ type?: string; id?: string; children?: unknown[] }> = [card as never];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node?.type === 'button' && typeof node.id === 'string') {
      const parsed = parseApprovalActionId(node.id);
      if (parsed) return parsed.payload;
    }
    if (Array.isArray(node?.children)) {
      stack.push(...(node.children as Array<{ type?: string; id?: string; children?: unknown[] }>));
    }
  }

  return null;
}
