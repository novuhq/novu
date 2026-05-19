import { parseMarkdownIntoTokens } from '@novu/js/internal';
import { HTMLAttributes, useMemo } from 'react';

import { cn } from '@/utils/ui';

type MarkdownTextProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children?: string;
};

export function MarkdownText({ children, className, ...rest }: MarkdownTextProps) {
  const tokens = useMemo(() => parseMarkdownIntoTokens(children || ''), [children]);

  return (
    <span className={cn(className)} {...rest}>
      {tokens.map((token, index) => {
        if (token.type === 'boldItalic') {
          return (
            <strong key={index}>
              <em>{token.content}</em>
            </strong>
          );
        }

        if (token.type === 'bold') {
          return <strong key={index}>{token.content}</strong>;
        }

        if (token.type === 'italic') {
          return <em key={index}>{token.content}</em>;
        }

        return <span key={index}>{token.content}</span>;
      })}
    </span>
  );
}
