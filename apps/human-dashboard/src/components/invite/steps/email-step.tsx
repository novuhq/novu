import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useCooldownSeconds } from '@/hooks/use-cooldown-seconds';
import type { ActiveInviteStatus, InviteChannel } from '@/lib/invite-api';

import { ConnectStepCard } from './connect-step-card';

type EmailStepProps = {
  status: ActiveInviteStatus;
  channel: InviteChannel;
  busy: boolean;
  connecting: boolean;
  cooldownUntil: number | null;
  error: ReactNode;
  onSend: (address: string) => void;
  onBack: () => void;
};

export function EmailStep({ status, channel, busy, connecting, cooldownUntil, error, onSend, onBack }: EmailStepProps) {
  const [address, setAddress] = useState('');
  const cooldownSeconds = useCooldownSeconds(cooldownUntil);
  const pending = channel.status === 'pending';
  const value = address.trim();

  return (
    <ConnectStepCard
      via="email"
      status={status}
      title="Confirm your email"
      description={`${status.agentName} emails you a link. It can message that address only after you open the link.`}
      error={error}
      onBack={onBack}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value || cooldownSeconds > 0) {
            return;
          }

          onSend(value);
        }}
      >
        <Field
          label="Email address"
          hint={
            pending
              ? `Check your inbox${channel.address ? ` at ${channel.address}` : ''}.`
              : 'We’ll email you a link to confirm this address.'
          }
        >
          {(props) => (
            <Input
              {...props}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={address}
              disabled={busy}
              onChange={(event) => setAddress(event.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          className="self-start"
          pending={connecting}
          disabled={busy || cooldownSeconds > 0 || !value}
        >
          {sendButtonLabel(pending, cooldownSeconds)}
        </Button>
      </form>
    </ConnectStepCard>
  );
}

function sendButtonLabel(pending: boolean, cooldownSeconds: number): string {
  if (!pending) {
    return 'Send confirmation';
  }

  if (cooldownSeconds > 0) {
    return `Resend in ${cooldownSeconds}s`;
  }

  return 'Resend';
}
