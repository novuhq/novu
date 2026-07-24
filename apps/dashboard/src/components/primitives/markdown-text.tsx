import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { HTMLAttributes } from 'react';
import { Streamdown } from 'streamdown';

import { cn } from '@/utils/ui';

const streamdownPlugins = { code, mermaid, math, cjk };

type MarkdownTextProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children?: string;
};

export function MarkdownText({ children, className, ...rest }: MarkdownTextProps) {
  return (
    <Streamdown
      className={cn(
        'target-anchor [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&_strong]:font-semibold [&_em]:italic',
        className
      )}
      plugins={streamdownPlugins}
      {...rest}
    >
      {children ?? ''}
    </Streamdown>
  );
}
