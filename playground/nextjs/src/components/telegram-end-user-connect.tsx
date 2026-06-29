import { NovuProvider, TelegramConnectButton } from '@novu/react';
import { novuConfig } from '@/utils/config';

const INTEGRATION_IDENTIFIER = process.env.NEXT_PUBLIC_CONNECT_TELEGRAM_END_USER_INTEGRATION_IDENTIFIER ?? '';

type TelegramEndUserConnectProps = {
  subscriberId: string;
};

export function TelegramEndUserConnect({ subscriberId }: TelegramEndUserConnectProps) {
  if (!novuConfig.applicationIdentifier || !INTEGRATION_IDENTIFIER) {
    return (
      <p className="text-sm text-muted-foreground">
        Set <code>NEXT_PUBLIC_NOVU_APP_ID</code> and{' '}
        <code>NEXT_PUBLIC_CONNECT_TELEGRAM_END_USER_INTEGRATION_IDENTIFIER</code> in <code>playground/nextjs/.env</code>
        , then restart the dev server.
      </p>
    );
  }

  return (
    <NovuProvider
      applicationIdentifier={novuConfig.applicationIdentifier}
      subscriberId={subscriberId}
      backendUrl={novuConfig.backendUrl}
      socketUrl={novuConfig.socketUrl}
    >
      <TelegramConnectButton
        integrationIdentifier={INTEGRATION_IDENTIFIER}
        connectLabel="Connect Telegram ↗"
        connectedLabel="Connected to Telegram"
      />
    </NovuProvider>
  );
}
