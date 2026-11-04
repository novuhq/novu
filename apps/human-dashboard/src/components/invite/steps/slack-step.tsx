import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { WaitingLine } from '@/components/invite/invite-card';
import { Button } from '@/components/ui/button';
import type { ActiveInviteStatus } from '@/lib/invite-api';

import { ConnectStepCard } from './connect-step-card';

type SlackStepProps = {
  status: ActiveInviteStatus;
  busy: boolean;
  connecting: boolean;
  /** Whether they already pressed the button: before that there is nothing to wait for. */
  started: boolean;
  error: ReactNode;
  onConnect: () => void;
  onBack: () => void;
};

/** Slack mints its link inside the click that opens the tab, so the browser doesn't block it. */
export function SlackStep({ status, busy, connecting, started, error, onConnect, onBack }: SlackStepProps) {
  return (
    <ConnectStepCard
      via="slack"
      status={status}
      title="Confirm your Slack account"
      description={`Sign in to Slack so ${status.agentName} can DM you.`}
      error={error}
      onBack={onBack}
    >
      <Button className="self-start" pending={connecting} disabled={busy} onClick={onConnect}>
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        Continue with Slack
      </Button>
      {started && <WaitingLine>Waiting for Slack…</WaitingLine>}
    </ConnectStepCard>
  );
}
