import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { ContinueToClerk } from '@/components/auth/continue-to-clerk';
import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { MCP_CONNECT_PARAM, mcpConnectPath, mcpConnectTarget } from '@/lib/auth-redirect';
import { requireHumanAccount } from '@/lib/human-account';

export const metadata: Metadata = {
  title: 'Signing in',
  robots: { index: false, follow: false },
  // Clerk's authorize page is in the URL, with the AI tool's sign-in state; keep it out of the Referer.
  referrer: 'origin',
};

/**
 * Where sign-in and sign-up send a person whom an AI tool connecting to the Agent Inbox MCP server sent to
 * sign in, with Clerk's page to go back to in `to` (`mcpConnectPath`). The tool reads the account as soon
 * as it's let in, and right after sign-up the webhook may not have made it yet, so this makes sure it
 * exists first. Then back to Clerk to approve the tool. Nothing waits for the onboarding: a person without
 * an agent gets it on their next dashboard visit.
 */
export default async function McpConnectPage(props: PageProps<'/mcp/connect'>) {
  const authorizeUrl = mcpConnectTarget((await props.searchParams)[MCP_CONNECT_PARAM]);
  if (!authorizeUrl) {
    redirect(DASHBOARD_HOME);
  }

  await requireHumanAccount({ returnTo: mcpConnectPath(authorizeUrl) });

  return (
    <AuthShell>
      <ContinueToClerk authorizeUrl={authorizeUrl} />
    </AuthShell>
  );
}
