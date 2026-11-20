import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { AgentLookProvider, AgentMascot } from '@/components/ui/agent-look';
import { mascotLookOf } from '@/lib/look';

export const metadata: Metadata = {
  title: 'Slack',
  robots: { index: false, follow: false },
};

function isConnected(status: string | string[] | undefined): boolean {
  return status === 'connected';
}

/**
 * Slack sends the operator here after they approve or deny the Agent Inbox app.
 * The API puts `connected` or `error` on the link, and the agent's look (`shape` and `color`) once its mascots
 * show it: nobody is signed in here, so the link is all the page knows about the agent.
 */
export default async function Page(props: PageProps<'/connect/slack/result'>) {
  const query = await props.searchParams;
  const connected = isConnected(query.status);

  return (
    <InviteFrame>
      <div className="flex w-full max-w-120 flex-col gap-5.5 rounded-xl border border-border bg-background p-5 sm:p-8">
        {connected ? (
          <AgentLookProvider look={mascotLookOf(query)}>
            <AgentMascot art="waiting" mood="happy" className="size-35" />
          </AgentLookProvider>
        ) : (
          <img src="/illustrations/state-error.svg" alt="" width={120} height={120} className="size-30" />
        )}
        <h1 className="text-2xl leading-7.5 tracking-[-0.02em]">
          {connected ? 'Slack is connected' : "Slack didn't connect"}
        </h1>
        <p className="text-[13px] leading-4.5 text-secondary">
          {connected
            ? 'You can close this tab. Agent Inbox will pick up the connection.'
            : 'Return to Agent Inbox and try connecting Slack again.'}
        </p>
      </div>
    </InviteFrame>
  );
}
