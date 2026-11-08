import type { AgentCardChild, AgentCardElement } from '@novu/js';
import { Button, type ButtonProps } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { toSafeExternalUrl } from '@/utils/url';
import { getCardButtonLabel } from './copilot-review-labels';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getLastCardSourceMessageId, isCopilotReviewActionId } from './copilot-web-chat-utils';

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

function CardActions({ actions, context }: { actions: CardActionChild[]; context: CardContext }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action, index) => {
        if (action.type === 'button') {
          return (
            <Button
              key={action.id}
              type="button"
              size="2xs"
              {...BUTTON_APPEARANCE[action.style ?? 'default']}
              title={action.tooltip}
              disabled={action.disabled || (isCopilotReviewActionId(action.id) && context.isReviewLocked)}
              onClick={() => context.onButtonClick(action)}
            >
              {getCardButtonLabel(action)}
            </Button>
          );
        }

        if (action.type === 'link-button') {
          const href = toSafeExternalUrl(action.url);
          if (!href) return null;

          return (
            <Button key={action.id ?? index} size="2xs" {...BUTTON_APPEARANCE[action.style ?? 'default']} asChild>
              <a href={href} target="_blank" rel="noreferrer" title={action.tooltip}>
                {action.label}
              </a>
            </Button>
          );
        }

        return null;
      })}
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
