import type { AgentCardChild, AgentCardElement } from '@novu/js';
import { CopilotReviewActionEnum } from '@novu/shared';
import { Fragment } from 'react';
import type { IconType } from 'react-icons';
import { RiCheckLine, RiCloseLine, RiRefreshLine } from 'react-icons/ri';
import { cn } from '@/utils/ui';
import { toSafeExternalUrl } from '@/utils/url';
import { getCardButtonLabel } from './copilot-review-labels';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getLastCardSourceMessageId, isCopilotReviewActionId } from './copilot-web-chat-utils';

type CardButtonChild = Extract<AgentCardChild, { type: 'button' }>;
type CardActionChild = Extract<AgentCardChild, { type: 'actions' }>['children'][number];
type CardButtonStyle = NonNullable<CardButtonChild['style']>;
type CardTextStyle = NonNullable<Extract<AgentCardChild, { type: 'text' }>['style']>;

/** Card actions read as text links, as in the design: only a danger action changes colour. */
function actionTone(style: CardButtonStyle | undefined): string {
  return style === 'danger' ? 'text-error-base' : 'text-text-strong';
}

const REVIEW_ACTION_ICONS: Partial<Record<string, IconType>> = {
  [CopilotReviewActionEnum.KEEP]: RiCheckLine,
  [CopilotReviewActionEnum.REVERT]: RiCloseLine,
  [CopilotReviewActionEnum.TRY_AGAIN]: RiRefreshLine,
};

const ACTION_LINK_CLASS =
  'flex items-center gap-1 text-label-xs font-medium leading-4 transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-50';

const TEXT_STYLES: Record<CardTextStyle, string> = {
  plain: 'text-text-strong',
  bold: 'font-medium text-text-strong',
  muted: 'text-text-soft',
};

type CardContext = {
  /** Review buttons stay locked while the agent works on, or has not yet answered, a click. */
  isReviewLocked: boolean;
  onButtonClick: (button: CardButtonChild) => void;
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

function CardActionButton({ action, context }: { action: CardButtonChild; context: CardContext }) {
  const Icon = REVIEW_ACTION_ICONS[action.id];

  return (
    <button
      type="button"
      title={action.tooltip}
      disabled={action.disabled || (isCopilotReviewActionId(action.id) && context.isReviewLocked)}
      onClick={() => context.onButtonClick(action)}
      className={cn(ACTION_LINK_CLASS, actionTone(action.style))}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {getCardButtonLabel(action)}
    </button>
  );
}

/** Card actions as one row of text links, separated by dots. Links with an unsafe URL are dropped, dots included. */
function CardActions({ actions, context }: { actions: CardActionChild[]; context: CardContext }) {
  const visible = actions.filter(
    (action) => action.type === 'button' || (action.type === 'link-button' && toSafeExternalUrl(action.url))
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((action, index) => (
        <Fragment key={action.type === 'button' ? action.id : `${action.type}:${action.id ?? index}`}>
          {index > 0 && (
            <span aria-hidden className="text-label-xs leading-4 text-text-soft">
              ·
            </span>
          )}
          {action.type === 'button' && <CardActionButton action={action} context={context} />}
          {action.type === 'link-button' && (
            <a
              href={toSafeExternalUrl(action.url) ?? undefined}
              target="_blank"
              rel="noreferrer"
              title={action.tooltip}
              className={cn(ACTION_LINK_CLASS, actionTone(action.style))}
            >
              {action.label}
            </a>
          )}
        </Fragment>
      ))}
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
      case 'section':
        return (
          <div key={key} className="flex flex-col gap-2">
            <CardChildren items={child.children} context={context} />
          </div>
        );
      default:
        return null;
    }
  });
}

/**
 * A card the agent posted. Text-only cards (the Keep / Revert / Try again resolution notes) read as plain text;
 * the review buttons only show on the newest card of the thread and lock while their click is being answered.
 */
export function CopilotCardBlock({ card, sourceMessageId }: { card: AgentCardElement; sourceMessageId: string }) {
  const { chat, sendCardAction, pendingReviewMessageId, isBusy, open } = useCopilotWebChat();
  const isLastCard = getLastCardSourceMessageId(chat?.messages ?? []) === sourceMessageId;
  const children = isLastCard ? card.children : withoutReviewButtons(card.children);
  const hasHeader = !!card.title || !!card.subtitle;

  if (children.length === 0 && !hasHeader) return null;

  const context: CardContext = {
    isReviewLocked: isBusy || pendingReviewMessageId === sourceMessageId,
    onButtonClick: (button) => {
      void sendCardAction({ actionId: button.id, sourceMessageId, value: button.value });
      // The clicked button locks, so hand the focus back to the composer.
      open();
    },
  };

  return (
    <div className={cn('flex flex-col gap-2', hasHeader && 'rounded-lg border border-stroke-soft bg-bg-weak p-3')}>
      {card.title && <p className="text-xs font-medium leading-4 text-text-strong">{card.title}</p>}
      {card.subtitle && <p className="text-xs leading-4 text-text-soft">{card.subtitle}</p>}
      <CardChildren items={children} context={context} />
    </div>
  );
}
