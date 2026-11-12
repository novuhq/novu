'use client';

import { useEffect, useId, useRef, useState } from 'react';

import {
  loadWhatsAppSetupAction,
  submitWhatsAppFirstMessageAction,
} from '@/app/(account)/(dashboard)/channels/actions';
import { FieldError } from '@/components/channels/setup-parts';
import { Badge } from '@/components/ui/badge';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { Step } from '@/components/ui/stepper';
import { cn } from '@/lib/utils';
import {
  AGENT_NAME_TOKEN,
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

const CHIP =
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 text-[13px] leading-4.5 text-secondary transition-colors hover:border-border-strong hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60';

type WhatsAppFirstMessageStepProps = {
  index: number;
  /** Only once WhatsApp is connected; before that the step waits. */
  ready: boolean;
  /** What the agent is called, for the preview. */
  agentName: string;
  firstMessage?: FirstMessage;
};

/**
 * The optional last step of the WhatsApp drawer: the message an agent sends first when someone's 24-hour window
 * has closed. It starts as our suggestion, the operator can rewrite it, and it goes to Meta for review.
 */
export function WhatsAppFirstMessageStep({
  index,
  ready,
  agentName,
  firstMessage: initial,
}: WhatsAppFirstMessageStepProps) {
  const [firstMessage, setFirstMessage] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial?.body ?? DEFAULT_FIRST_MESSAGE);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  useEffect(() => {
    setFirstMessage(initial);
  }, [initial]);

  const inReview = firstMessage?.status === 'PENDING' || firstMessage?.status === 'IN_APPEAL';

  // Meta says nothing on its own here, so while the review runs the drawer looks again now and then.
  useEffect(() => {
    if (!ready || !inReview) {
      return;
    }

    const timer = setInterval(async () => {
      const setup = await loadWhatsAppSetupAction().catch(() => null);
      if (setup && (setup.step === 'connected' || setup.step === 'verify') && setup.firstMessage) {
        setFirstMessage(setup.firstMessage);
      }
    }, REVIEW_CHECK_MS);

    return () => clearInterval(timer);
  }, [ready, inReview]);

  const showForm = ready && (editing || !firstMessage || firstMessage.status === 'REJECTED');
  const problem = firstMessageProblem(draft);

  const submit = async () => {
    if (problem) {
      setError(problem);

      return;
    }

    setPending(true);
    setError(undefined);
    const result = await submitWhatsAppFirstMessageAction(draft).catch(() => null);
    setPending(false);
    if (!result?.ok) {
      setError(result?.error ?? 'We couldn’t send the message to Meta just now. Please try again.');

      return;
    }

    setFirstMessage(result.firstMessage);
    setEditing(false);
  };

  const insertAgentName = () => {
    const field = textarea.current;
    const at = field ? field.selectionStart : draft.length;
    const end = field ? field.selectionEnd : draft.length;
    setDraft(`${draft.slice(0, at)}${AGENT_NAME_TOKEN}${draft.slice(end)}`);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(at + AGENT_NAME_TOKEN.length, at + AGENT_NAME_TOKEN.length);
    });
  };

  return (
    <Step
      index={index}
      title="Your first message (optional)"
      status={stepStatus(ready, showForm, Boolean(error))}
      summary={firstMessage && <Summary firstMessage={firstMessage} agentName={agentName} />}
      action={
        ready && firstMessage && !showForm ? (
          <Button
            variant="quiet"
            className={SMALL_BUTTON}
            onClick={() => {
              setDraft(firstMessage.body);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        ) : null
      }
    >
      <p className="text-[13px] leading-4.5 text-secondary">
        WhatsApp lets {agentName} write first only within 24 hours of someone’s last message. After that it can send
        only a message Meta has approved, like this one. When they reply, {agentName} sends what it was waiting to say.
      </p>
      <p className="text-[13px] leading-4.5 text-secondary">
        Meta reviews it, usually within minutes, sometimes up to 24 hours. Meta charges these messages to your WhatsApp
        Business account, so it needs a payment method there. You can skip this and add it later.
      </p>

      {firstMessage?.status === 'REJECTED' && (
        <p role="alert" className="text-xs leading-4 text-danger">
          <FieldError>
            Meta rejected it{firstMessage.rejectedReason ? ` (${humanReason(firstMessage.rejectedReason)})` : ''}.
            Change the wording and send it again.
          </FieldError>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-xs leading-4 font-medium text-foreground">
          The message
        </label>
        <textarea
          id={id}
          ref={textarea}
          value={draft}
          disabled={pending}
          maxLength={FIRST_MESSAGE_MAX_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(undefined);
          }}
          className={cn(
            'min-h-24 w-full resize-y rounded bg-background px-3 py-2.5 text-[13px] leading-5 text-foreground ring-1 ring-border-strong ring-inset placeholder:text-placeholder',
            'focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-accent/20 focus-visible:outline-none focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
            error && 'ring-danger focus-visible:ring-danger'
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={CHIP}
            disabled={pending || draft.includes(AGENT_NAME_TOKEN)}
            onClick={insertAgentName}
          >
            Insert agent name
          </button>
          <span className="font-mono text-[11px] leading-4 text-muted">
            {draft.trim().length}/{FIRST_MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <p className="text-xs leading-4 text-muted">
          Keep it a plain notice. Offers or promotions get rejected, or charged as marketing.
        </p>
      </div>

      <Preview text={fillFirstMessage(draft.trim() || DEFAULT_FIRST_MESSAGE, agentName)} />

      {error && (
        <p role="alert" className="text-xs leading-4 text-danger">
          <FieldError>{error}</FieldError>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void submit()} pending={pending} disabled={Boolean(problem)}>
          Send to Meta for review
        </Button>
        {editing && (
          <Button variant="quiet" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </Step>
  );
}

/** How the message shows in WhatsApp, with its one button. */
function Preview({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[11px] leading-4 font-medium text-muted uppercase">Preview</p>
      <div className="max-w-72 overflow-hidden rounded-lg bg-raised ring-1 ring-border">
        <p className="px-3 py-2 text-[13px] leading-5 whitespace-pre-wrap text-foreground">{text}</p>
        <p className="border-t border-border px-3 py-2 text-center text-[13px] leading-4.5 font-medium text-accent">
          {VIEW_MESSAGE_BUTTON}
        </p>
      </div>
    </div>
  );
}

/** Meta's reasons are codes such as `INVALID_FORMAT`. */
function humanReason(reason: string): string {
  return reason.toLowerCase().replaceAll('_', ' ');
}

function stepStatus(ready: boolean, showForm: boolean, failed: boolean): 'upcoming' | 'current' | 'error' | 'done' {
  if (!ready) {
    return 'upcoming';
  }

  if (!showForm) {
    return 'done';
  }

  return failed ? 'error' : 'current';
}

/** The finished step's line: Meta's review and the message as it reads. */
function Summary({ firstMessage, agentName }: { firstMessage: FirstMessage; agentName: string }) {
  const badge = firstMessageBadge(firstMessage);

  return (
    <span className="inline-flex items-center gap-2">
      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
      <span className="truncate">{fillFirstMessage(firstMessage.body, agentName)}</span>
    </span>
  );
}
