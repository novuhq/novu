import '@assistant-ui/react-markdown/styles/dot.css';

import type { TextMessagePartProps } from '@assistant-ui/react';
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from '@assistant-ui/react-markdown';
import { type FC, memo, useMemo, useRef, useState } from 'react';
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/ui';
import { TooltipIconButton } from './tooltip-icon-button';

type MarkdownTextProps = Partial<TextMessagePartProps> & {
  components?: Parameters<typeof memoizeMarkdownComponents>[0];
};

const useShallowStable = <T extends Record<string, unknown> | undefined>(value: T): T => {
  const ref = useRef(value);
  if (value !== ref.current) {
    const prev = ref.current;
    const stable =
      value !== undefined &&
      prev !== undefined &&
      Object.keys(prev).length === Object.keys(value).length &&
      Object.keys(value).every((key) => prev[key] === value[key]);
    if (!stable) ref.current = value;
  }

  return ref.current;
};

const MarkdownTextImpl: FC<MarkdownTextProps> = ({ components }) => {
  const stableComponents = useShallowStable(components);
  const markdownComponents = useMemo(() => {
    if (!stableComponents) return defaultComponents;

    return {
      ...defaultComponents,
      ...memoizeMarkdownComponents(stableComponents),
    };
  }, [stableComponents]);

  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md text-paragraph-sm text-text-strong leading-5"
      components={markdownComponents}
      defer
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

function useCopyToClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1500);
  };

  return { isCopied, copyToClipboard };
}

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <div className="border-stroke-soft bg-bg-weak mt-3 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs">
      <span className="text-text-soft font-medium lowercase">{language}</span>
      <TooltipIconButton
        tooltip="Copy"
        onClick={() => {
          if (!code || isCopied) return;
          void copyToClipboard(code);
        }}
      >
        {isCopied ? <RiCheckLine className="size-3.5" /> : <RiFileCopyLine className="size-3.5" />}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn('mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0', className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn('mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0', className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn('mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0', className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn('mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0', className)} {...props} />
  ),
  p: ({ className, ...props }) => <p className={cn('my-3 leading-5 first:mt-0 last:mb-0', className)} {...props} />,
  a: ({ className, ...props }) => (
    <a
      className={cn('text-primary-base hover:text-primary-base/80 underline underline-offset-2', className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn('border-stroke-soft text-text-sub my-3 border-s-2 ps-4', className)} {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn('text-text-soft my-3 ms-5 list-disc marker:text-text-soft [&>li]:mt-1', className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn('my-3 ms-5 list-decimal marker:text-text-soft [&>li]:mt-1', className)} {...props} />
  ),
  hr: ({ className, ...props }) => <hr className={cn('border-stroke-soft my-3', className)} {...props} />,
  table: ({ className, ...props }) => (
    <table className={cn('my-3 w-full border-separate border-spacing-0 overflow-y-auto', className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn('bg-bg-weak px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg', className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn('border-stroke-soft border-s border-b px-3 py-1.5 text-start last:border-e', className)}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        'm-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg',
        className
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => <li className={cn('leading-relaxed', className)} {...props} />,
  strong: ({ className, ...props }) => <strong className={cn('font-semibold', className)} {...props} />,
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        'border-stroke-soft bg-bg-weak overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed',
        className
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();

    return (
      <code
        className={cn(!isCodeBlock && 'bg-bg-weak rounded-md px-1.5 py-0.5 font-mono text-[0.85em]', className)}
        {...props}
      />
    );
  },
  CodeHeader,
});
