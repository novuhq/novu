import { Show, SignIn, useUser } from '@clerk/react';
import { PagerDutyEndUserConnect } from '@/components/pagerduty-end-user-connect';
import Title from '@/components/Title';

export default function ConnectPagerDutyEndUserPage() {
  return (
    <>
      <Title title="Connect PagerDuty" />
      <Show when="signed-out">
        <div className="flex max-w-xl flex-col items-center gap-6 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in to link your PagerDuty service to your Novu subscriber account.
          </p>
          <SignIn routing="hash" />
        </div>
      </Show>
      <Show when="signed-in">
        <ConnectPagerDutyContent />
      </Show>
    </>
  );
}

function ConnectPagerDutyContent() {
  const { user } = useUser();

  if (!user?.id) {
    return null;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Each signed-in user brings their own PagerDuty service — a distinct integration key routes to their own
          escalation policy and responders. Paste the Events API v2 integration key from your PagerDuty service to have
          Novu trigger incidents in <em>your</em> PagerDuty account.
        </p>
        <p className="text-xs text-muted-foreground">
          Subscriber: <code>{user.id}</code>
        </p>
      </div>
      <PagerDutyEndUserConnect subscriberId={user.id} />
    </div>
  );
}
