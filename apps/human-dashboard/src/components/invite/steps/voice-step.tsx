import { type ReactNode, useState } from 'react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { Field, Input } from '@/components/ui/input';
import { useCooldownSeconds } from '@/hooks/use-cooldown-seconds';
import type { ActiveInviteStatus, InviteChannel } from '@/lib/invite-api';
import { cn } from '@/lib/utils';

import { ConnectStepCard } from './connect-step-card';

/** Matches VOICE_VERIFICATION_CODE_LENGTH on the API, which is what the call reads out. */
const VOICE_CODE_LENGTH = 4;

type VoiceStepProps = {
  status: ActiveInviteStatus;
  channel: InviteChannel;
  /** Whether a call just went out, so the code box is open before the status catches up. */
  callPlaced: boolean;
  busy: boolean;
  connecting: boolean;
  confirming: boolean;
  cooldownUntil: number | null;
  error: ReactNode;
  onSend: (address: string) => void;
  onConfirm: (code: string) => Promise<boolean>;
  onRemove: () => void;
  onBack: () => void;
};

export function VoiceStep({
  status,
  channel,
  callPlaced,
  busy,
  connecting,
  confirming,
  cooldownUntil,
  error,
  onSend,
  onConfirm,
  onRemove,
  onBack,
}: VoiceStepProps) {
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const cooldownSeconds = useCooldownSeconds(cooldownUntil);
  const awaitingCode = callPlaced || channel.status === 'pending';
  const value = address.trim();

  return (
    <ConnectStepCard
      via="voice"
      status={status}
      title="Confirm your phone number"
      description={`${status.agentName} calls you and reads a code. It can call that number only after you type the code.`}
      error={error}
      onBack={onBack}
    >
      <div className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!value || cooldownSeconds > 0) {
              return;
            }

            setCode('');
            onSend(value);
          }}
        >
          <Field
            label="Phone number"
            hint={
              awaitingCode
                ? `Answer the call${channel.address ? ` to ${channel.address}` : ''}, then type the code it reads.`
                : 'Include the country code, like +1 415 555 0123.'
            }
          >
            {(props) => (
              <Input
                {...props}
                type="tel"
                name="tel"
                autoComplete="tel"
                inputMode="tel"
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
            {callButtonLabel(awaitingCode, cooldownSeconds)}
          </Button>
        </form>

        {awaitingCode && (
          <div className="flex flex-col gap-3">
            <CodeInput
              value={code}
              onChange={setCode}
              onComplete={(next) => {
                void onConfirm(next).then((accepted) => {
                  if (!accepted) {
                    setCode('');
                  }
                });
              }}
              label="Code from the call"
              // A spoken code is shorter than an emailed one: it is typed back from memory.
              length={VOICE_CODE_LENGTH}
              disabled={busy}
              autoFocus
              invalid={false}
            />
            <Button
              type="button"
              variant="quiet"
              className={cn(SMALL_BUTTON, 'self-start')}
              pending={confirming}
              disabled={busy}
              onClick={onRemove}
            >
              Use a different number
            </Button>
          </div>
        )}
      </div>
    </ConnectStepCard>
  );
}

function callButtonLabel(awaitingCode: boolean, cooldownSeconds: number): string {
  if (cooldownSeconds > 0) {
    return `Call again in ${cooldownSeconds}s`;
  }

  if (awaitingCode) {
    return 'Call again';
  }

  return 'Call me';
}
