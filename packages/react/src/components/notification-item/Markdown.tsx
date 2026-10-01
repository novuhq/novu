import { markdownStyles, parseMarkdownIntoTokens } from '@novu/js/ui-core';
import React, { Fragment, useMemo } from 'react';
import { useStyle } from '../../hooks/internal/useEngineStores';

type MarkdownProps = {
  children: string;
  strongKey: string;
  emKey: string;
  context: Record<string, unknown>;
};

/** Renders the same inline markdown as the engine: `**strong**`, `*em*`, and both nested. */
export const Markdown = ({ children, strongKey, emKey, context }: MarkdownProps) => {
  const style = useStyle();
  const tokens = useMemo(() => parseMarkdownIntoTokens(children), [children]);
  const strongClassName = style({ key: strongKey as never, className: markdownStyles.strong.className, context });
  const emClassName = style({ key: emKey as never, className: markdownStyles.em.className, context });

  return (
    <>
      {tokens.map((token, index) => {
        const key = `${index}-${token.type}`;
        if (token.type === 'boldItalic') {
          return (
            <strong key={key} className={strongClassName}>
              <em className={emClassName}>{token.content}</em>
            </strong>
          );
        }
        if (token.type === 'bold') {
          return (
            <strong key={key} className={strongClassName}>
              {token.content}
            </strong>
          );
        }
        if (token.type === 'italic') {
          return (
            <em key={key} className={emClassName}>
              {token.content}
            </em>
          );
        }

        return <Fragment key={key}>{token.content}</Fragment>;
      })}
    </>
  );
};
