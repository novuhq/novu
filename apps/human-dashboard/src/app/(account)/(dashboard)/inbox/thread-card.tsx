'use client';

import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { channelName, firstName, type InboxCard, type InboxCardState } from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { CrossFade } from './cross-fade';
import { InboxTime } from './inbox-time';

/** What became of a card, and the colour that says so. Only waiting, answered and "no reply needed" are drawn. */
type CardOutcome = 'waiting' | 'answered' | 'denied' | 'closed';

const OUTCOME_TONES: Record<CardOutcome, { text: string; dot: string }> = {
  waiting: { text: 'text-warning', dot: 'bg-warning' },
  answered: { text: 'text-success', dot: 'bg-success' },
  denied: { text: 'text-danger', dot: 'bg-danger' },
  closed: { text: 'text-muted', dot: 'bg-muted' },
};

function outcomeOf(state: InboxCardState): CardOutcome {
  switch (state.status) {
    case 'pending':
      return 'waiting';
    case 'answered':
    case 'approved':
      return 'answered';
    case 'denied':
      return 'denied';
    default:
      // `delivered` (a tell), `expired` and `canceled`: nothing more will happen.
      return 'closed';
  }
}

/**
 * A `tell`, `ask`, `approve` or `choose` the agent sent, drawn the way the thread's channel shows it, with
 * what became of it at the bottom. Read-only: people answer on their channel, never here.
 *
 * The open thread keeps up with the card: when it is answered, approved or expires, the card as it was
 * fades out in place, the new one fades in, and the room it takes grows or shrinks to it.
 */
export function ThreadCard({ card }: { card: InboxCard }) {
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      style={{ height }}
      className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={ref}>
        <CrossFade id={JSON.stringify(card.state)} value={card}>
          {(shown, className) => <CardFace card={shown} className={className} />}
        </CrossFade>
      </div>
    </div>
  );
}

function CardFace({ card, className }: { card: InboxCard; className?: string }) {
  const outcome = outcomeOf(card.state);
  const tone = OUTCOME_TONES[outcome];

  return (
    <div className={cn('flex flex-col rounded-lg border border-border-strong bg-subtle', className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 font-mono text-[10px] leading-3.5">
        <span className="font-medium text-accent uppercase">{card.kind}</span>
        <span className="ml-auto text-muted">{card.presentation.label}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <p className="text-[13px] leading-4.5 font-medium text-foreground">{card.title}</p>
        {[card.subtitle, card.body].map(
          (text) =>
            text && (
              <p key={text} className="text-[13px] leading-[19px] whitespace-pre-line text-default">
                {text}
              </p>
            )
        )}
        <CardAnswer card={card} outcome={outcome} />
      </div>
      <p
        className={cn(
          'flex items-center gap-1.5 border-t border-border bg-background/50 px-3 py-2 font-mono text-[11px] leading-3.5',
          tone.text
        )}
      >
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', tone.dot)} />
        <span>
          {card.state.label}
          {card.state.respondedAt && (
            <>
              {' · '}
              <InboxTime iso={card.state.respondedAt} format="stamp" />
            </>
          )}
        </span>
      </p>
    </div>
  );
}

function CardAnswer({ card, outcome }: { card: InboxCard; outcome: CardOutcome }) {
  switch (card.kind) {
    case 'approve':
      return <ApproveButtons card={card} outcome={outcome} />;
    case 'choose':
      return <ChooseOptions card={card} outcome={outcome} />;
    case 'ask':
      return <AskReply card={card} outcome={outcome} />;
    default:
      return null;
  }
}

/** The approve card's buttons, in the channel's order. Once someone pressed one, it is lit and the others fade. */
function ApproveButtons({ card, outcome }: { card: InboxCard; outcome: CardOutcome }) {
  const buttons = card.buttons ?? [];
  const chosen = chosenButtonOf(card.state);

  if (buttons.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {buttons.map((button) => {
        const isChosen = button.id === chosen;
        const approves = isChosen && outcome === 'answered';
        const denies = isChosen && outcome === 'denied';

        return (
          <span
            key={button.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[5px] border px-3 py-1.25 text-xs leading-4',
              approves && 'border-success/50 bg-success/12 font-medium text-success',
              denies && 'border-danger/50 bg-danger/12 font-medium text-danger',
              !isChosen && 'border-border-strong text-default',
              // While nobody has answered, the button the channel shows as the main one stands out.
              outcome === 'waiting' && button.id === 'approve' && 'border-default font-medium',
              outcome !== 'waiting' && !isChosen && 'opacity-45'
            )}
          >
            {isChosen && (
              <span aria-hidden="true" className="font-mono text-[11px] leading-3.5 font-medium">
                {approves ? '✓' : '✕'}
              </span>
            )}
            {button.label}
          </span>
        );
      })}
    </div>
  );
}

/** Plain Approve and Deny carry no option of their own: the outcome says which was pressed. */
function chosenButtonOf(state: InboxCardState): string | undefined {
  if (state.optionId) {
    return state.optionId;
  }

  if (state.status === 'approved') {
    return 'approve';
  }

  return state.status === 'denied' ? 'deny' : undefined;
}

/** The choose card's options. Once someone picked one, it is lit and the others fade. */
function ChooseOptions({ card, outcome }: { card: InboxCard; outcome: CardOutcome }) {
  const options = card.options ?? [];

  if (options.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1 pt-1">
      {options.map((option) => {
        const picked = outcome === 'answered' && option.id === card.state.optionId;

        return (
          <li
            key={option.id}
            className={cn(
              'flex items-center gap-2.5 rounded-md border px-2.5 py-1.75 text-xs leading-4',
              picked ? 'border-success/50 bg-success/8 font-medium text-foreground' : 'border-border text-default',
              outcome !== 'waiting' && !picked && 'opacity-60'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                picked ? 'border-success' : 'border-border-strong'
              )}
            >
              {picked && <span className="size-1.5 rounded-full bg-success" />}
            </span>
            {option.label}
            {picked && <span className="sr-only">(picked)</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Where the person types their answer to an ask, on their own channel; their reply once it came. */
function AskReply({ card, outcome }: { card: InboxCard; outcome: CardOutcome }) {
  const channel = channelName(card.presentation.channel);
  const reply = card.state.text?.trim();
  let text: string;

  if (reply) {
    text = reply;
  } else if (outcome === 'waiting') {
    text = `${describeAnswerers(card.state)} in ${channel}`;
  } else {
    text = 'No reply';
  }

  return (
    <p
      className={cn(
        'flex items-center gap-2 rounded-md border border-border-strong bg-background px-2.5 py-2 text-xs leading-4 whitespace-pre-line',
        reply ? 'text-foreground' : 'text-muted'
      )}
    >
      {text}
    </p>
  );
}

/** "Omer replies", "Omer or Maya replies", or "Anyone in the thread replies" when anyone may. */
function describeAnswerers(state: InboxCardState): string {
  const names = (state.waitingOn ?? []).map(firstName);

  if (names.length === 0) {
    return 'Anyone in the thread replies';
  }

  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;

  return `${who} replies`;
}
