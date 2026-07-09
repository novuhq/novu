import { ChatCard } from '@novu/shared';
import { MarkdownText } from '@/components/primitives/markdown-text';
import { cn } from '@/utils/ui';

/**
 * Generic (provider-agnostic) rendering of a ChatCard inside the mock chat bubble.
 * Providers render their native equivalents at delivery; this preview mirrors the
 * common denominator: markdown text, images, dividers, and link-button chips.
 */
export const ChatCardPreview = ({ card, variant = 'default' }: { card: ChatCard; variant?: 'mini' | 'default' }) => {
  return (
    <div className={cn('flex flex-col gap-2', { 'line-clamp-3': variant === 'mini' })}>
      {card.title && <span className="text-foreground-950 text-xs font-bold">{card.title}</span>}
      {card.subtitle && <span className="text-foreground-600 text-xs">{card.subtitle}</span>}
      {card.imageUrl && <img src={card.imageUrl} alt="" className="max-h-40 max-w-full rounded-md object-cover" />}
      {card.children.map((child, index) => {
        switch (child.type) {
          case 'text':
            return (
              <MarkdownText key={index} className="text-foreground-950 text-xs font-normal">
                {child.content}
              </MarkdownText>
            );
          case 'image':
            return (
              <img
                key={index}
                src={child.url}
                alt={child.alt ?? ''}
                className="max-h-40 max-w-full rounded-md object-cover"
              />
            );
          case 'divider':
            return <hr key={index} className="border-neutral-100" />;
          case 'actions':
            return (
              <div key={index} className="flex flex-wrap gap-1.5">
                {child.children.map((button, buttonIndex) => (
                  <a
                    key={buttonIndex}
                    href={button.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium',
                      button.style === 'primary' && 'border-transparent bg-neutral-800 text-white',
                      button.style === 'danger' && 'border-transparent bg-red-600 text-white',
                      (!button.style || button.style === 'default') && 'border-neutral-200 bg-white text-foreground-950'
                    )}
                  >
                    {button.label}
                  </a>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};
