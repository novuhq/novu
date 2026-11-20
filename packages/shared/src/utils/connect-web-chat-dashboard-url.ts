/** Dashboard Connect agent detail tab slug for in-product Web Chat tester. */
export const CONNECT_WEB_CHAT_TAB = 'chat';

export function buildConnectWebChatDashboardUrl(input: {
  connectDashboardUrl: string;
  environmentSlug: string | null;
  agentIdentifier: string;
}): string {
  const base = input.connectDashboardUrl.replace(/\/$/, '');
  const agentPath = input.environmentSlug
    ? `/env/${input.environmentSlug}/agents/${encodeURIComponent(input.agentIdentifier)}`
    : `/agents/${encodeURIComponent(input.agentIdentifier)}`;

  return `${base}${agentPath}/${CONNECT_WEB_CHAT_TAB}`;
}
