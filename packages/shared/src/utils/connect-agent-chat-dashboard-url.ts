/** Dashboard Connect agent detail tab slug for in-product Agent Chat tester. */
export const CONNECT_AGENT_CHAT_TAB = 'chat';

export function buildConnectAgentChatDashboardUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
}): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');
  const agentPath = input.environmentSlug
    ? `/env/${input.environmentSlug}/agents/${encodeURIComponent(input.agentIdentifier)}`
    : `/agents/${encodeURIComponent(input.agentIdentifier)}`;

  return `${base}${agentPath}/${CONNECT_AGENT_CHAT_TAB}`;
}
