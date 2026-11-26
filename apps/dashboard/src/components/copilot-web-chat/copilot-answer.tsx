import type { CopilotAnswerDetails, CopilotFollowUp } from '@novu/shared';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiCheckLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiThumbDownFill,
  RiThumbDownLine,
  RiThumbUpFill,
  RiThumbUpLine,
} from 'react-icons/ri';
import { MessageResponse } from '@/components/ai-elements/message';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import {
  type CopilotTurn,
  formatCopilotThoughtFor,
  getCopilotAnswerId,
  getCopilotAnswerText,
  hasCopilotReviewCard,
} from './copilot-answers';
import { CopilotResultCardView } from './copilot-result-card';
import { CopilotAssistantMessage, CopilotUserMessage } from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getUserMessageText } from './copilot-web-chat-utils';
import { useCopilotFollowUp } from './use-copilot-follow-up';

type Feedback = 'up' | 'down';

/** Kept for the session, so an answer reopened in the popover still shows the rating it got. */
const feedbackByAnswer = new Map<string, Feedback>();

function ThoughtFor({ details }: { details: CopilotAnswerDetails }) {
  const [open, setOpen] = useState(false);
  const label = formatCopilotThoughtFor(details.thoughtMs);

  if (details.thoughts.length === 0) {
    return <span className="text-xs leading-4 text-text-soft">{label}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1 text-xs leading-4 text-text-soft hover:text-text-sub"
      >
        {open ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
        {label}
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-l border-stroke-soft pl-3 text-xs leading-4 text-text-soft [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-4">
          {details.thoughts.map((thought, index) => (
            <MessageResponse key={index}>{thought}</MessageResponse>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  isPressed,
  onClick,
  children,
}: {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={isPressed}
          onClick={onClick}
          className={cn(
            'flex items-center justify-center rounded-md p-1 text-text-soft outline-none transition-colors hover:bg-bg-weak hover:text-text-sub focus-visible:ring-1 focus-visible:ring-stroke-strong',
            isPressed && 'text-text-strong'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      {/* Above the popover, which rises over a sheet (z-[51]). */}
      <TooltipContent className="z-[60] px-2 py-1 text-xs" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function AnswerActions({ turn, onRetry }: { turn: CopilotTurn; onRetry?: () => void }) {
  const { chat, surface, pageContext } = useCopilotWebChat();
  const track = useTelemetry();
  const answerId = getCopilotAnswerId(turn);
  const [feedback, setFeedback] = useState(() => feedbackByAnswer.get(answerId));
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const telemetry = { conversationId: chat?.conversationId, messageId: answerId, surface, page: pageContext?.page };

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const rate = (rating: Feedback) => {
    const next = feedback === rating ? undefined : rating;
    setFeedback(next);
    if (next) {
      feedbackByAnswer.set(answerId, next);
      track(TelemetryEvent.COPILOT_ANSWER_FEEDBACK, { ...telemetry, rating: next });
    } else {
      feedbackByAnswer.delete(answerId);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getCopilotAnswerText(turn));
    } catch {
      return;
    }

    track(TelemetryEvent.COPILOT_ANSWER_COPIED, telemetry);
    setIsCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="-ml-1 flex items-center gap-0.5">
      <ActionButton label="Good answer" isPressed={feedback === 'up'} onClick={() => rate('up')}>
        {feedback === 'up' ? <RiThumbUpFill className="size-[15px]" /> : <RiThumbUpLine className="size-[15px]" />}
      </ActionButton>
      <ActionButton label="Bad answer" isPressed={feedback === 'down'} onClick={() => rate('down')}>
        {feedback === 'down' ? (
          <RiThumbDownFill className="size-[15px]" />
        ) : (
          <RiThumbDownLine className="size-[15px]" />
        )}
      </ActionButton>
      <ActionButton label={isCopied ? 'Copied' : 'Copy'} onClick={() => void copy()}>
        {isCopied ? (
          <RiCheckLine className="size-[15px] text-success-base" />
        ) : (
          <RiFileCopyLine className="size-[15px]" />
        )}
      </ActionButton>
      {onRetry && (
        <ActionButton
          label="Retry"
          onClick={() => {
            track(TelemetryEvent.COPILOT_ANSWER_RETRIED, telemetry);
            onRetry();
          }}
        >
          <RiRefreshLine className="size-[15px]" />
        </ActionButton>
      )}
    </div>
  );
}

/** The "Follow up…" chips under the newest answer; one that opens a page shows an outward arrow. */
function CopilotFollowUps({
  followUps,
  onFollowUp,
}: {
  followUps: CopilotFollowUp[];
  onFollowUp: (followUp: CopilotFollowUp, index: number) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-label-xs text-text-sub">Follow up…</p>
      {followUps.map((followUp, index) => {
        const Icon = followUp.url ? RiArrowRightUpLine : RiArrowRightSLine;

        return (
          <button
            key={followUp.text}
            type="button"
            title={followUp.text}
            onClick={() => onFollowUp(followUp, index)}
            className="flex max-w-full items-center gap-1.5 rounded-full border border-stroke-soft bg-bg-white px-2.5 py-[5px] text-left text-label-xs text-text-strong outline-none transition-colors hover:bg-bg-weak focus-visible:ring-1 focus-visible:ring-stroke-strong"
          >
            <Icon className="size-3.5 shrink-0 text-text-sub" aria-hidden />
            <span className="truncate">{followUp.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * One turn of the thread: the user's message, then the answer with how long the Copilot thought, its result cards,
 * the copy / rate / retry row and, under the newest answer, its follow-ups. Rendered as siblings, so the thread's gap
 * spaces them.
 */
export function CopilotTurnView({
  turn,
  isLatest,
  followUps = [],
}: {
  turn: CopilotTurn;
  isLatest: boolean;
  followUps?: CopilotFollowUp[];
}) {
  const { isBusy, hasRunError, sendMessage } = useCopilotWebChat();
  const applyFollowUp = useCopilotFollowUp();
  const isAnswering = isLatest && isBusy;
  const hasThinkingParts = turn.replies.some((reply) => reply.parts.some((part) => part.type === 'thinking'));
  const hasAnswerText = getCopilotAnswerText(turn).length > 0;
  const prompt = turn.prompt ? getUserMessageText(turn.prompt) : '';
  // A turn that changed the workflow retries with its review card's Try again, which reverts the change first; a run
  // that failed retries from the error notice.
  const canRetry = isLatest && !isBusy && !hasRunError && !!prompt && !hasCopilotReviewCard(turn);

  return (
    <>
      {turn.prompt && <CopilotUserMessage message={turn.prompt} />}
      {turn.details && !hasThinkingParts && <ThoughtFor details={turn.details} />}
      {turn.replies.map((reply) => (
        <CopilotAssistantMessage key={reply.id} message={reply} />
      ))}
      {turn.resultCards.map((card, index) => (
        <CopilotResultCardView key={`${card.type}:${index}`} card={card} />
      ))}
      {hasAnswerText && !isAnswering && (
        <AnswerActions turn={turn} onRetry={canRetry ? () => void sendMessage(prompt) : undefined} />
      )}
      {followUps.length > 0 && (
        <CopilotFollowUps
          followUps={followUps}
          onFollowUp={(followUp, index) => applyFollowUp(followUp, index, 'chip')}
        />
      )}
    </>
  );
}
