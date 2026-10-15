'use client';

import { ArrowDown, ArrowRight, Check, Send } from 'lucide-react';
import { useTransition } from 'react';

import { leaveTestAction, sendTestEmailAction } from '@/app/(account)/onboarding/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { Eyebrow, StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { ClockTime, Refresh, Spinner } from '@/components/onboarding/parts';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type TestStepProps = {
  /** What the agent is called in a sentence: its address without the domain. */
  handle: string;
  address: string;
  /** Where the test email goes: the address the operator signed up with. */
  operatorEmail: string | null;
  sentAt?: string;
  replyAt?: string;
};

/**
 * Step 2: the agent has its address, and the operator tries it both ways. The agent writes to them, they
 * reply, and the reply shows up in the agent's inbox right here. The step only moves on when they say so.
 *
 * The step goes through three states: nothing sent, the email sent, the reply in. Whatever a state
 * changes rises in (`Refresh`); the rest of the step stays where it is.
 */
export function TestStep({ handle, address, operatorEmail, sentAt, replyAt }: TestStepProps) {
  const [sending, startSending] = useTransition();
  const [leaving, startLeaving] = useTransition();
  const subject = `Hi, I’m ${handle}`;

  return (
    <>
      <Refresh id={replyAt ? 'passed' : 'live'} className="flex flex-col gap-5.5">
        <Eyebrow tone="success">{replyAt ? 'Test passed' : 'Address live'}</Eyebrow>
        {replyAt ? (
          <>
            <StepTitle>
              It works <em>both ways</em>
            </StepTitle>
            <StepLead>Your reply is in {handle}’s inbox. Connect your agent so it can read it.</StepLead>
          </>
        ) : (
          <>
            <StepTitle>
              Your agent has an <em>address</em>
            </StepTitle>
            <StepLead>Send a test email, then reply to it.</StepLead>
          </>
        )}
      </Refresh>

      <div className="flex min-h-13.5 items-center gap-3 rounded-[10px] border border-border-strong bg-subtle py-3 pr-3 pl-4">
        <ChannelIcon via="email" className="size-5 [&>svg]:size-2.75" />
        <p className="min-w-0 flex-1 truncate font-mono text-base leading-5.5 font-medium text-foreground">{address}</p>
        <CopyButton value={address} label="Copy the address" variant="secondary" className={SMALL_BUTTON}>
          Copy
        </CopyButton>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border-strong bg-subtle">
        <p className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 font-mono text-xs leading-4 text-default">
          <span className="text-[11px] leading-3.5 text-muted">From</span>
          <span className="min-w-0 truncate">{address}</span>
          {/* Drawn: the mono font's subset has no arrow, and the fallback's is two letters wide. */}
          <ArrowRight aria-label="to" className="h-3.5 w-[1ch] shrink-0 text-muted" strokeWidth={1.5} />
          <span className="min-w-0 truncate">{operatorEmail ?? 'your email'}</span>
        </p>
        <div className="flex flex-col gap-1 px-3.5 py-3">
          <p className="text-sm leading-5 font-medium text-foreground">{subject}</p>
          <p className="text-[13px] leading-4.75 text-secondary">
            Reply to this email. Your reply lands in {handle}’s inbox below.
          </p>
        </div>
        {/* The line above the row stays; what the row says comes in anew once the email is sent. */}
        <div className="border-t border-border">
          <Refresh id={sentAt ? 'sent' : 'not-sent'} className="flex min-h-12 items-center gap-2 px-3.5 py-2.5">
            {sentAt ? (
              <>
                <Check aria-hidden="true" className="size-2.5 shrink-0 text-success" strokeWidth={3} />
                <p className="min-w-0 flex-1 truncate font-mono text-[11px] leading-3.5 text-secondary">
                  Sent to {operatorEmail ?? 'your email'} · <ClockTime iso={sentAt} />
                </p>
                <Button
                  variant="quiet"
                  className={SMALL_BUTTON}
                  pending={sending}
                  onClick={() => startSending(sendTestEmailAction)}
                >
                  Send again
                </Button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-xs leading-4 text-muted">Goes to your sign-up email</p>
                <Button className={SMALL_BUTTON} pending={sending} onClick={() => startSending(sendTestEmailAction)}>
                  <Send aria-hidden="true" className="size-3.5" />
                  Send test email
                </Button>
              </>
            )}
          </Refresh>
        </div>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-border">
        <p className="flex items-center gap-2 border-b border-border bg-background px-3.5 py-2.5">
          <span className="flex-1 font-mono text-[10px] leading-3.5 font-medium tracking-[0.8px] text-muted uppercase">
            {handle}’s inbox
          </span>
          <span className="font-mono text-[11px] leading-3.5 text-success">active</span>
        </p>
        <Refresh id={replyAt ? 'reply' : 'waiting'}>
          {replyAt ? (
            <p
              aria-live="polite"
              className="flex items-center gap-3 bg-accent/6 px-3.5 py-3 text-[13px] leading-4.5 shadow-[inset_2px_0_0_var(--color-accent)]"
            >
              <ArrowDown aria-hidden="true" className="h-4.5 w-2 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="min-w-0 shrink truncate font-medium text-foreground">{operatorEmail ?? 'You'}</span>
              <span className="min-w-0 flex-1 truncate text-default">Re: {subject}</span>
              <span className="hidden shrink-0 rounded bg-accent/12 px-1.75 py-0.5 font-mono text-[11px] leading-3.5 text-accent sm:inline">
                delivered · waiting for your agent
              </span>
              <span className="shrink-0 font-mono text-[11px] leading-3.5 text-muted">now</span>
            </p>
          ) : (
            <p className="flex items-center gap-3 px-3.5 py-3 text-[13px] leading-4.5 text-secondary">
              <Spinner className="w-2.5 font-mono font-medium text-accent" />
              <span className="flex-1">Waiting for your reply…</span>
              <span className="font-mono text-[11px] leading-3.5 text-muted">replies land here</span>
            </p>
          )}
        </Refresh>
      </div>

      <div
        className={cn(
          'transition-opacity duration-200 motion-reduce:transition-none',
          leaving && 'pointer-events-none opacity-60'
        )}
      >
        {/* A beat after the reply itself, so the eye gets from the inbox to what to do next. */}
        <Refresh id={replyAt ? 'passed' : 'live'} className="flex items-center gap-3 [animation-delay:120ms]">
          {replyAt ? (
            <>
              <Button onClick={() => startLeaving(() => leaveTestAction('connect'))}>Connect your agent</Button>
              <Button variant="quiet" onClick={() => startLeaving(() => leaveTestAction('later'))}>
                Later
              </Button>
            </>
          ) : (
            <Button variant="quiet" onClick={() => startLeaving(() => leaveTestAction('skip'))}>
              Skip the test
            </Button>
          )}
        </Refresh>
      </div>
    </>
  );
}
