import { Show, SignIn, useUser } from '@clerk/react';
import Title from '@/components/Title';
import { TelegramEndUserConnect } from '@/components/telegram-end-user-connect';

export default function ConnectTelegramEndUserPage() {
  return (
    <>
      <Title title="Connect Telegram" />
      <Show when="signed-out">
        <div className="flex max-w-xl flex-col items-center gap-6 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in to link your Telegram account to the healing repro agent.
          </p>
          <SignIn routing="hash" />
        </div>
      </Show>
      <Show when="signed-in">
        <ConnectTelegramContent />
      </Show>
    </>
  );
}

function ConnectTelegramContent() {
  const { user } = useUser();

  if (!user?.id) {
    return null;
  }

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">
        Each signed-in user gets their own Telegram connection. Tap the button to open Telegram and press{' '}
        <strong>Start</strong> on the bot.
      </p>
      <TelegramEndUserConnect subscriberId={user.id} />
    </div>
  );
}
