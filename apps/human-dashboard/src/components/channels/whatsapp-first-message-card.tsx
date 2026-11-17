'use client';

import { ArrowUpRight, ChevronDown, Eye, Reply, Send } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import {
  loadWhatsAppSetupAction,
  type SubmitWhatsAppFirstMessageResult,
  submitWhatsAppFirstMessageAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { ConnectedCard, FieldError } from '@/components/channels/setup-parts';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { Fold } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import {
  DEFAULT_FIRST_MESSAGE,
  FIRST_MESSAGE_MAX_LENGTH,
  type FirstMessage,
  fillFirstMessage,
  firstMessageBadge,
  firstMessageProblem,
  VIEW_MESSAGE_BUTTON,
} from '@/lib/whatsapp-first-message';

/** Meta's review takes minutes to a day; the drawer asks again this often while it is open. */
const REVIEW_CHECK_MS = 30_000;

/** Where Meta keeps the card that pays for these messages. */
const META_BILLING_URL = 'https://business.facebook.com/billing_hub/payment_settings/';

type WhatsAppOnProps = {
  handle: string;
  /** What the agent is called, for the first message. */
  agentName: string;
  businessNumber?: string;
  firstMessage?: FirstMessage;
};

/**
 * What closes the WhatsApp drawer once both steps are done: the card that says WhatsApp is on, and under it the
 * first message, which lets the agent write first outside WhatsApp's 24-hour window.
 */
export function WhatsAppOn({ handle, agentName, businessNumber, firstMessage }: WhatsAppOnProps) {
  return (
    <>
      <ConnectedCard via="whatsapp" title="WhatsApp Business is on">
        {businessNumber
          ? `People can now message ${handle} at ${businessNumber}.`
          : `People can now message ${handle} on WhatsApp.`}
      </ConnectedCard>
      <li className="animate-rise-in motion-reduce:animate-none">
        <WhatsAppFirstMessageCard agentName={agentName} firstMessage={firstMessage} />
      </li>
    </>
  );
}

type Mode = 'here' | null;

/**
 * The message an agent sends first when someone's 24-hour window has closed: the operator writes it here and we send
 * it to Meta for review.
 */
function WhatsAppFirstMessageCard({
  agentName,
  firstMessage: initial,
}: {
  agentName: string;
  firstMessage?: FirstMessage;
}) {
  const [firstMessage, setFirstMessage] = useState(initial);
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    setFirstMessage(initial);
  }, [initial]);

  const inReview = firstMessage?.status === 'PENDING' || firstMessage?.status === 'IN_APPEAL';

  // Meta says nothing on its own here, so while the review runs the drawer looks again now and then.
  useEffect(() => {
    if (!inReview) {
      return;
    }

    const timer = setInterval(async () => {
      const setup = await loadWhatsAppSetupAction().catch(() => null);
      if (setup && (setup.step === 'connected' || setup.step === 'verify') && setup.firstMessage) {
        setFirstMessage(setup.firstMessage);
      }
    }, REVIEW_CHECK_MS);

    return () => clearInterval(timer);
  }, [inReview]);

  const done = (next: FirstMessage) => {
    setFirstMessage(next);
    setMode(null);
  };

  // A rejected message goes back to the form, with Meta's reason above it.
  const shown: Mode = mode ?? (firstMessage?.status === 'REJECTED' ? 'here' : null);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong p-4">
      <div className="flex items-center gap-2.5">
        <Send aria-hidden="true" className="size-3.5 shrink-0 text-secondary" />
        <h3 className="text-[13px] leading-4.5 font-medium text-foreground">{agentName} can message people first</h3>
        {firstMessage && <StatusBadge firstMessage={firstMessage} />}
      </div>

      {shown === 'here' && (
        <WriteHere
          agentName={agentName}
          firstMessage={firstMessage}
          onDone={done}
          onCancel={firstMessage?.status === 'REJECTED' ? undefined : () => setMode(null)}
        />
      )}
      {!shown &&
        (firstMessage ? (
          <Status firstMessage={firstMessage} agentName={agentName} onEdit={() => setMode('here')} />
        ) : (
          <NotSetUp agentName={agentName} onSetUp={() => setMode('here')} />
        ))}
    </section>
  );
}

function StatusBadge({ firstMessage }: { firstMessage: FirstMessage }) {
  const badge = firstMessageBadge(firstMessage);

  return badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null;
}

/** Nothing set up yet: what the first message is for, and the way to write one. */
function NotSetUp({ agentName, onSetUp }: { agentName: string; onSetUp: () => void }) {
  return (
    <>
      <p className="text-xs leading-[17px] text-secondary">
        WhatsApp lets {agentName} write first only within 24 hours of someone’s last message. After that it needs a
        message Meta approved, usually within a day. Meta needs a card on your Meta Business account for this.
      </p>
      <Button variant="secondary" className={`${SMALL_BUTTON} self-start`} onClick={onSetUp}>
        Set it up
      </Button>
    </>
  );
}

/** A message is set: where Meta's review stands, and what's left to do on Meta's side. */
function Status({
  firstMessage,
  agentName,
  onEdit,
}: {
  firstMessage: FirstMessage;
  agentName: string;
  onEdit: () => void;
}) {
  const approved = firstMessage.status === 'APPROVED';
  const stopped = firstMessage.status === 'PAUSED' || firstMessage.status === 'DISABLED';

  return (
    <>
      <p className="truncate text-xs leading-[17px] text-default">{fillFirstMessage(firstMessage.body, agentName)}</p>
      <p className="text-xs leading-[17px] text-secondary">
        {approved && `${agentName} can write first now. Meta charges these messages to your Meta Business account.`}
        {stopped && 'Meta stopped this message. Change the wording and send it again.'}
        {!approved &&
          !stopped &&
          'Ready once Meta approves it, usually within a day. Meta needs a card on your Meta Business account for this.'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={META_BILLING_URL}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName('secondary', SMALL_BUTTON)}
        >
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          Add a card in Meta
        </a>
        <Button variant="quiet" className={SMALL_BUTTON} onClick={onEdit}>
          Change the message
        </Button>
      </div>
    </>
  );
}

/** The recommended way: the operator writes the message here and we send it to Meta for review. */
function WriteHere({
  agentName,
  firstMessage,
  onDone,
  onCancel,
}: {
  agentName: string;
  firstMessage?: FirstMessage;
  onDone: (firstMessage: FirstMessage) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(firstMessage?.body ?? DEFAULT_FIRST_MESSAGE);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Folded away until asked for: the text box is what matters, the bubble is a check.
  const [previewOpen, setPreviewOpen] = useState(false);
  const id = useId();
  const previewId = useId();
  const problem = firstMessageProblem(draft);

  const submit = async () => {
    if (problem) {
      setError(problem);

      return;
    }

    setPending(true);
    setError(undefined);
    const result = await submitWhatsAppFirstMessageAction(draft).catch(
      (): SubmitWhatsAppFirstMessageResult | null => null
    );
    setPending(false);
    if (!result?.ok) {
      setError(result?.error ?? 'We couldn’t send the message to Meta just now. Please try again.');

      return;
    }

    onDone(result.firstMessage);
  };

  return (
    <>
      {firstMessage?.status === 'REJECTED' && (
        <p role="alert" className="text-xs leading-4 text-danger">
          <FieldError>
            Meta rejected it{firstMessage.rejectedReason ? ` (${humanReason(firstMessage.rejectedReason)})` : ''}.
            Change the wording and send it again.
          </FieldError>
        </p>
      )}
      <p className="text-xs leading-[17px] text-secondary">
        When someone hasn’t written in 24 hours, they get this. When they reply, {agentName} sends what it was waiting
        to say. We send it to Meta for review.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-xs leading-4 font-medium text-foreground">
          The message
        </label>
        <textarea
          id={id}
          value={draft}
          disabled={pending}
          maxLength={FIRST_MESSAGE_MAX_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(undefined);
          }}
          className={cn(
            'min-h-20 w-full resize-y rounded bg-background px-3 py-2.5 text-[13px] leading-5 text-foreground ring-1 ring-border-strong ring-inset placeholder:text-placeholder',
            'focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-accent/20 focus-visible:outline-none focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
            error && 'ring-danger focus-visible:ring-danger'
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={previewOpen}
            aria-controls={previewId}
            onClick={() => setPreviewOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-1.5 text-xs leading-4 text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
          >
            <Eye aria-hidden="true" className="size-3.5" />
            {previewOpen ? 'Hide preview' : 'Preview'}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 transition-transform duration-200 motion-reduce:transition-none',
                previewOpen && 'rotate-180'
              )}
            />
          </button>
          <span className="font-mono text-[11px] leading-4 text-muted">
            {draft.trim().length}/{FIRST_MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <Fold open={previewOpen}>
          <div id={previewId} className="pt-1">
            <Preview text={fillFirstMessage(draft.trim() || DEFAULT_FIRST_MESSAGE, agentName)} />
          </div>
        </Fold>
        <p className="text-xs leading-4 text-muted">
          Keep it a plain notice. Offers or promotions get rejected, or charged as marketing.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs leading-4 text-danger">
          <FieldError>{error}</FieldError>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button className={SMALL_BUTTON} onClick={() => void submit()} pending={pending} disabled={Boolean(problem)}>
          Send to Meta for review
        </Button>
        {onCancel && (
          <Button variant="quiet" className={SMALL_BUTTON} onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </>
  );
}

/** How the message shows in WhatsApp: a chat bubble from the business number, with its one button under it. */
function Preview({ text }: { text: string }) {
  return (
    <div className="max-w-72 overflow-hidden rounded-xl rounded-tl-sm bg-raised ring-1 ring-border">
      <p className="px-3 pt-2.5 text-[13px] leading-5 whitespace-pre-wrap text-foreground">{text}</p>
      <p className="px-3 pt-0.5 pb-2 text-right text-[10px] leading-3 text-muted">now</p>
      <p className="flex items-center justify-center gap-1.5 border-t border-border py-2 text-[13px] leading-4.5 font-medium text-accent">
        <Reply aria-hidden="true" className="size-3.5" />
        {VIEW_MESSAGE_BUTTON}
      </p>
    </div>
  );
}

/** Meta's reasons are codes such as `INVALID_FORMAT`. */
function humanReason(reason: string): string {
  return reason.toLowerCase().replaceAll('_', ' ');
}
