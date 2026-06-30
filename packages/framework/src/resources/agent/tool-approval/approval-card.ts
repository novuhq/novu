import { Actions, Button, Card, CardText } from '../../../cards';
import type { AgentToolCall } from '../agent.types';

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
