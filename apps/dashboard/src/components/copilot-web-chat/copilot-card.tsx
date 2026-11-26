import type { AgentCardChild, AgentCardElement, AgentMessage } from '@novu/js';
import { isCopilotPromptActionId } from '@novu/shared';
import { RiCheckLine } from 'react-icons/ri';
import { Button, type ButtonProps, buttonVariants } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { toSafeExternalUrl } from '@/utils/url';
import { getCardButtonLabel } from './copilot-review-labels';
import { useCopilotWebChat } from './copilot-web-chat-context';
import {
  type CopilotIssueRow,
  getCopilotLinkKind,
  getReviewCardSourceMessageId,
  getUserMessageText,
  isCopilotReviewActionId,
  isModifiedClick,
  readCopilotIssueRows,
} from './copilot-web-chat-utils';
import { useCopilotLinkNavigate } from './use-copilot-link-navigate';

type CardButtonChild = Extract<AgentCardChild, { type: 'button' }>;
type CardActionChild = Extract<AgentCardChild, { type: 'actions' }>['children'][number];
type CardButtonStyle = NonNullable<CardButtonChild['style']>;
type CardTextStyle = NonNullable<Extract<AgentCardChild, { type: 'text' }>['style']>;

const BUTTON_APPEARANCE: Record<CardButtonStyle, Pick<ButtonProps, 'variant' | 'mode'>> = {
  primary: { variant: 'primary', mode: 'filled' },
  danger: { variant: 'error', mode: 'outline' },
  default: { variant: 'secondary', mode: 'outline' },
};

const TEXT_STYLES: Record<CardTextStyle, string> = {
  plain: 'text-text-strong',
  bold: 'font-medium text-text-strong',
  muted: 'text-text-soft',
};

type CardContext = {
  /** Review buttons stay locked while the agent works on, or has not yet answered, a click. */
  isReviewLocked: boolean;
  /** Asks and fixes send a message, which waits until the agent is done. */
  isBusy: boolean;
  /** What the user sent after this card, so a Fix whose request went out shows as asked. */
  sentTexts: ReadonlySet<string>;
  /** Sends `text` as the user's message, for an ask or a fix. */
  onAsk: (text: string) => void;
  onButtonClick: (button: CardButtonChild) => void;
  onDashboardLinkClick: (url: string) => void;
};

/** Drops the Keep / Revert / Try again buttons, and the containers left empty without them. */
function withoutReviewButtons(children: AgentCardChild[]): AgentCardChild[] {
  return children.flatMap((child): AgentCardChild[] => {
    if (child.type === 'button') return isCopilotReviewActionId(child.id) ? [] : [child];

    if (child.type === 'actions') {
      const actions = child.children.filter(
        (action) => action.type !== 'button' || !isCopilotReviewActionId(action.id)
      );

      return actions.length > 0 ? [{ ...child, children: actions }] : [];
    }

    if (child.type === 'section') {
      const nested = withoutReviewButtons(child.children);

      return nested.length > 0 ? [{ ...child, children: nested }] : [];
    }

    return [child];
  });
}

function isButtonDisabled(button: CardButtonChild, context: CardContext): boolean {
  if (button.disabled) return true;
  if (isCopilotReviewActionId(button.id)) return context.isReviewLocked;
  if (isCopilotPromptActionId(button.id)) return context.isBusy || !button.value;

  return false;
}

function CardActions({ actions, context }: { actions: CardActionChild[]; context: CardContext }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action, index) => {
        if (action.type === 'button') {
          return (
            <Button
              key={`${action.id}:${index}`}
              type="button"
              size="2xs"
              {...BUTTON_APPEARANCE[action.style ?? 'default']}
              title={action.tooltip}
              disabled={isButtonDisabled(action, context)}
              onClick={() => context.onButtonClick(action)}
            >
              {getCardButtonLabel(action)}
            </Button>
          );
        }

        if (action.type === 'link-button') {
          const href = toSafeExternalUrl(action.url);
          if (!href) return null;

          const isDashboardLink = getCopilotLinkKind(href, window.location.origin) === 'dashboard';
          const { root } = buttonVariants({ size: '2xs', ...BUTTON_APPEARANCE[action.style ?? 'default'] });

          // An anchor with the button's look: `Button asChild` renders nothing around a plain anchor here.
          return (
            <a
              key={action.id ?? index}
              href={href}
              target={isDashboardLink ? undefined : '_blank'}
              rel={isDashboardLink ? undefined : 'noreferrer'}
              title={action.tooltip}
              className={root({ class: 'gap-1' })}
              onClick={(event) => {
                if (!isDashboardLink || isModifiedClick(event)) return;

                event.preventDefault();
                context.onDashboardLinkClick(href);
              }}
            >
              {action.label}
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}

/** One issue of a workflow review: the step it is on, what is wrong, and Fix, which asks the Copilot to fix it. */
function IssueRow({ row, context, onFix }: { row: CopilotIssueRow; context: CardContext; onFix: () => void }) {
  const isAsked = context.sentTexts.has(row.fix);

  return (
    <div className="flex items-start gap-2 border-t border-stroke-soft pt-2 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        {row.stepName && (
          <span className="max-w-full truncate rounded bg-bg-white px-1.5 font-mono text-[10px] leading-4 text-text-sub ring-1 ring-inset ring-stroke-soft">
            {row.stepName}
          </span>
        )}
        <p className="text-xs leading-4 text-text-strong">{row.title}</p>
      </div>
      <Button
        type="button"
        size="2xs"
        variant="secondary"
        mode="outline"
        disabled={isAsked || context.isBusy}
        leadingIcon={isAsked ? RiCheckLine : undefined}
        title={isAsked ? 'Already asked' : row.fix}
        onClick={onFix}
      >
        {isAsked ? 'Asked' : 'Fix'}
      </Button>
    </div>
  );
}

function CardChildren({ items, context }: { items: AgentCardChild[]; context: CardContext }) {
  return items.map((child, index) => {
    const key = `${child.type}:${index}`;

    switch (child.type) {
      case 'text':
        return (
          <p key={key} className={cn('whitespace-pre-wrap text-xs leading-4', TEXT_STYLES[child.style ?? 'plain'])}>
            {child.content}
          </p>
        );
      case 'button':
        return <CardActions key={key} actions={[child]} context={context} />;
      case 'actions':
        return <CardActions key={key} actions={child.children} context={context} />;
      case 'section': {
        const [issue] = readCopilotIssueRows({ type: 'card', children: [child] });
        if (issue) {
          return <IssueRow key={key} row={issue} context={context} onFix={() => context.onAsk(issue.fix)} />;
        }

        return (
          <div key={key} className="flex flex-col gap-2">
            <CardChildren items={child.children} context={context} />
          </div>
        );
      }
      default:
        return null;
    }
  });
}

/** The texts of the user messages sent after the message that holds the card. */
function getTextsSentAfter(messages: readonly AgentMessage[], sourceMessageId: string): Set<string> {
  const cardIndex = messages.findIndex((message) =>
    message.parts.some((part) => part.type === 'card' && part.sourceMessageId === sourceMessageId)
  );
  if (cardIndex === -1) return new Set();

  return new Set(
    messages
      .slice(cardIndex + 1)
      .filter((message) => message.role === 'user')
      .map(getUserMessageText)
  );
}

/**
 * A card the agent posted. Text-only cards (the Keep / Revert / Try again resolution notes) read as plain text;
 * the review buttons only show on the newest review card of the thread and lock while their click is being answered.
 * Ask and Fix buttons send their text as the user's message, and a dashboard link button opens the page with this chat.
 */
export function CopilotCardBlock({ card, sourceMessageId }: { card: AgentCardElement; sourceMessageId: string }) {
  const { chat, sendCardAction, sendMessage, pendingReviewMessageId, isBusy, open } = useCopilotWebChat();
  const navigateInPlace = useCopilotLinkNavigate();
  const messages = chat?.messages ?? [];
  const isOpenReviewCard = getReviewCardSourceMessageId(messages) === sourceMessageId;
  const children = isOpenReviewCard ? card.children : withoutReviewButtons(card.children);
  const hasHeader = !!card.title || !!card.subtitle;

  if (children.length === 0 && !hasHeader) return null;

  const onAsk = (text: string) => {
    void sendMessage(text);
    // The composer is busy until the answer, so it keeps the focus for the next message.
    open();
  };
  const context: CardContext = {
    isReviewLocked: isBusy || pendingReviewMessageId === sourceMessageId,
    isBusy,
    sentTexts: getTextsSentAfter(messages, sourceMessageId),
    onAsk,
    onButtonClick: (button) => {
      if (isCopilotPromptActionId(button.id)) {
        if (button.value) onAsk(button.value);

        return;
      }

      void sendCardAction({ actionId: button.id, sourceMessageId, value: button.value });
      // The clicked button locks, so hand the focus back to the composer.
      open();
    },
    onDashboardLinkClick: navigateInPlace,
  };

  return (
    <div className={cn('flex flex-col gap-2', hasHeader && 'rounded-lg border border-stroke-soft bg-bg-weak p-3')}>
      {card.title && <p className="text-xs font-medium leading-4 text-text-strong">{card.title}</p>}
      {card.subtitle && <p className="text-xs leading-4 text-text-soft">{card.subtitle}</p>}
      <CardChildren items={children} context={context} />
    </div>
  );
}
