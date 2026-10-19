import type { Metadata } from 'next';

import { InviteFrame } from '@/components/invite/invite-frame';
import { MascotFace } from '@/components/ui/mascot-face';

export const metadata: Metadata = {
  title: 'Slack',
  robots: { index: false, follow: false },
};

function isConnected(status: string | string[] | undefined): boolean {
  return status === 'connected';
}

/**
 * Slack sends the operator here after they approve or deny the Agent Inbox app.
 * The API only puts `connected` or `error` on the link.
 */
export default async function Page(props: PageProps<'/connect/slack/result'>) {
  const { status } = await props.searchParams;
  const connected = isConnected(status);

  return (
    <InviteFrame>
      <div className="flex w-full max-w-120 flex-col gap-5.5 rounded-xl border border-border bg-background p-5 sm:p-8">
        {connected ? (
          <MascotFace art="waiting" mood="happy" className="size-35" />
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
