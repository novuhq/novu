import { Show, SignIn, useUser } from '@clerk/react';
import { GrafanaEndUserConnect } from '@/components/grafana-end-user-connect';
import Title from '@/components/Title';

export default function ConnectGrafanaEndUserPage() {
  return (
    <>
      <Title title="Connect Grafana" />
      <Show when="signed-out">
        <div className="flex max-w-xl flex-col items-center gap-6 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in to link your Grafana OnCall integration to your Novu subscriber account.
          </p>
          <SignIn routing="hash" />
        </div>
      </Show>
      <Show when="signed-in">
        <ConnectGrafanaContent />
      </Show>
    </>
  );
}

function ConnectGrafanaContent() {
  const { user } = useUser();

  if (!user?.id) {
    return null;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Each signed-in user brings their own Grafana stack: a distinct incoming-webhook URL routes to their own
          OnCall escalation chains and responders. Paste the Formatted Webhook URL from your Grafana IRM integration to
          have Novu create alert groups in <em>your</em> Grafana account.
        </p>
        <p className="text-xs text-muted-foreground">
          Subscriber: <code>{user.id}</code>
        </p>
      </div>
      <GrafanaEndUserConnect subscriberId={user.id} />
    </div>
  );
}
