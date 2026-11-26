import type { AgentCardChild, AgentCardElement } from '@novu/js';
import { Button, type ButtonProps } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { toSafeExternalUrl } from '@/utils/url';
import { CopilotReviewBlock } from './copilot-review-block';
import { useCopilotWebChat } from './copilot-web-chat-context';
import { getReviewCardState, isCopilotReviewActionId, listEnabledReviewButtons } from './copilot-web-chat-utils';

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
  onButtonClick: (button: CardButtonChild) => void;
};

/** Drops the Keep / Revert / Try again buttons, which `CopilotReviewBlock` draws, and the containers left empty. */
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
              disabled={action.disabled}
              onClick={() => context.onButtonClick(action)}
            >
              {action.label}
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
 * A card the agent posted. Text-only cards (the Keep / Revert / Try again resolution notes) read as plain text; the
 * review buttons are drawn by `CopilotReviewBlock` for where the review stands, and not at all once a click on them
 * was answered.
 */
export function CopilotCardBlock({ card, sourceMessageId }: { card: AgentCardElement; sourceMessageId: string }) {
  const { chat, sendCardAction, open } = useCopilotWebChat();
  const reviewState = getReviewCardState(chat?.messages ?? [], sourceMessageId);
  const review = reviewState && reviewState !== 'answered' ? reviewState : undefined;
  const children = withoutReviewButtons(card.children);
  const hasHeader = !!card.title || !!card.subtitle;

  if (children.length === 0 && !hasHeader && !review) return null;

  const context: CardContext = {
    onButtonClick: (button) => {
      void sendCardAction({ actionId: button.id, sourceMessageId, value: button.value });
      open();
    },
  };

  return (
    <div className={cn('flex flex-col gap-2', hasHeader && 'rounded-lg border border-stroke-soft bg-bg-weak p-3')}>
      {card.title && <p className="text-xs font-medium leading-4 text-text-strong">{card.title}</p>}
      {card.subtitle && <p className="text-xs leading-4 text-text-soft">{card.subtitle}</p>}
      {children.length > 0 && <CardChildren items={children} context={context} />}
      {review && (
        <CopilotReviewBlock
          state={review}
          buttons={listEnabledReviewButtons(card.children)}
          sourceMessageId={sourceMessageId}
        />
      )}
    </div>
  );
}
