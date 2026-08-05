import type {
  CardElement,
  CardElementActionsElement,
  CardElementChild,
  CardElementLinkButtonElement,
  CardElementTextElement,
} from '@novu/shared';

import { cn } from '@/utils/ui';
import { renderInlineMarkdown } from './inline-markdown';

/**
 * Slack Block Kit Builder measured styles (desktop message preview).
 * `CardElement` is our DSL name only — this renders flat message blocks, not a bordered card UI.
 */
const TEXT_TYPOGRAPHY_CLASSES: Record<NonNullable<CardElementTextElement['style']>, string> = {
  plain: 'text-[15px] font-normal leading-[22px] text-[#1d1c1d]',
  bold: 'text-[15px] font-bold leading-[22px] text-[#1d1c1d]',
  muted: 'text-[13px] font-normal leading-[18px] text-[#616061]',
};

const BUTTON_STYLE_CLASSES: Record<NonNullable<CardElementLinkButtonElement['style']>, string> = {
  primary: 'bg-[#007a5a] text-white',
  danger: 'bg-[#e01e5a] text-white',
  default: 'border border-[rgba(94,93,96,0.45)] bg-white text-[#1d1c1d]',
};

/**
 * Maily blockquotes compile to `> `-prefixed lines (Slack mrkdwn). Slack hides the `>` glyphs and
 * draws a 4px `#ddd` bar with 16px padding — match that instead of showing literal `>` characters.
 */
function isBlockquoteContent(content: string): boolean {
  const nonEmptyLines = content.split('\n').filter((line) => line.trim().length > 0);

  return nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^>\s?/.test(line));
}

function stripBlockquotePrefixes(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/^>\s?/, ''))
    .join('\n');
}

function MessageText({ element }: { element: CardElementTextElement }) {
  const style = element.style ?? 'plain';
  const isQuote = isBlockquoteContent(element.content);
  const content = isQuote ? stripBlockquotePrefixes(element.content) : element.content;

  if (isQuote) {
    return (
      <blockquote
        className={cn(
          'relative my-1 whitespace-pre-wrap pl-4',
          "before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:rounded-lg before:bg-[#ddd] before:content-['']",
          TEXT_TYPOGRAPHY_CLASSES[style]
        )}
      >
        {renderInlineMarkdown(content)}
      </blockquote>
    );
  }

  return (
    <p className={cn('m-0 whitespace-pre-wrap', style === 'muted' ? 'my-1' : 'mb-1', TEXT_TYPOGRAPHY_CLASSES[style])}>
      {renderInlineMarkdown(content)}
    </p>
  );
}

function MessageImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="pointer-events-none my-2 max-h-60 w-full max-w-full object-contain object-left"
    />
  );
}

function MessageActions({ element }: { element: CardElementActionsElement }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {element.children.map((button, index) => (
        <span
          key={button.id ?? `${button.url}-${index}`}
          aria-disabled="true"
          className={cn(
            'inline-flex h-7 cursor-default select-none items-center justify-center rounded px-2 pb-px text-[13px] font-bold leading-none',
            BUTTON_STYLE_CLASSES[button.style ?? 'default']
          )}
        >
          {button.label}
        </span>
      ))}
    </div>
  );
}

function MessageChild({ child }: { child: CardElementChild }) {
  switch (child.type) {
    case 'text':
      return <MessageText element={child} />;
    case 'image':
      return <MessageImage src={child.url} alt={child.alt ?? ''} />;
    case 'divider':
      return <hr className="my-1 mb-2 h-px w-full border-0 bg-[rgba(29,28,29,0.13)]" />;
    case 'actions':
      return <MessageActions element={child} />;
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
}

/**
 * Renders a compiled `CardElement` DSL as flat Slack-style message blocks
 * (sections, images, dividers, actions) — matching how `@chat-adapter/slack`'s
 * `cardToBlockKit` serializes delivery payloads. There is no bordered card chrome;
 * "card" is only the DSL type name.
 */
export const CardRenderer = ({ card, className }: { card: CardElement; className?: string }) => {
  return (
    <div className={cn('flex w-full flex-col', className)}>
      {card.title && <p className="leading-5.5 m-0 mb-1 text-[15px] font-black text-[#1d1c1d]">{card.title}</p>}
      {card.subtitle && <p className="leading-4.5 m-0 my-1 text-[13px] font-normal text-[#616061]">{card.subtitle}</p>}
      {card.imageUrl && <MessageImage src={card.imageUrl} alt={card.title ?? ''} />}
      {card.children.map((child, index) => (
        <MessageChild key={index} child={child} />
      ))}
    </div>
  );
};
