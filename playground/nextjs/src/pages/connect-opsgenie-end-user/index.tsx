import { Show, SignIn, useUser } from '@clerk/react';
import { OpsgenieEndUserConnect } from '@/components/opsgenie-end-user-connect';
import Title from '@/components/Title';

export default function ConnectOpsgenieEndUserPage() {
  return (
    <>
      <Title title="Connect Opsgenie" />
      <Show when="signed-out">
        <div className="flex max-w-xl flex-col items-center gap-6 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in to link your Opsgenie account to your Novu subscriber account.
          </p>
          <SignIn routing="hash" />
        </div>
      </Show>
      <Show when="signed-in">
        <ConnectOpsgenieContent />
      </Show>
    </>
  );
}

function ConnectOpsgenieContent() {
  const { user } = useUser();

  if (!user?.id) {
    return null;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Each signed-in user brings their own Opsgenie API integration: a distinct API key routes to their own account,
          teams, and escalations. Paste the API key from your Opsgenie API integration to have Novu create alerts in{' '}
          <em>your</em> Opsgenie account.
        </p>
        <p className="text-xs text-muted-foreground">
          Subscriber: <code>{user.id}</code>
        </p>
      </div>
      <OpsgenieEndUserConnect subscriberId={user.id} />
    </div>
  );
}
