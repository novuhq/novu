import * as React from 'react';

import { cn } from '@/utils/ui';
import { cva, VariantProps } from 'class-variance-authority';

const textareaVariants = cva(
  'text-foreground-950 flex text-sm w-full flex-nowrap items-center min-h-[60px] gap-1.5 rounded-md border bg-transparent shadow-sm transition-colors focus-within:outline-none focus-visible:outline-none hover:bg-neutral-alpha-50 disabled:cursor-not-allowed disabled:opacity-50 has-[value=""]:text-foreground-400 disabled:bg-neutral-alpha-100 disabled:text-foreground-300',
  {
    variants: {
      size: {
        default: 'h-8 px-2 py-1.5',
      },
      state: {
        default:
          'border-neutral-alpha-200 focus-within:border-neutral-alpha-950 focus-visible:border-neutral-alpha-950',
        error: 'border-destructive',
      },
    },
    defaultVariants: {
      size: 'default',
      state: 'default',
    },
  }
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & VariantProps<typeof textareaVariants>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, state, size, ...props }, ref) => {
  return <textarea className={cn(textareaVariants({ state, size }), className)} ref={ref} {...props} />;
});
Textarea.displayName = 'Textarea';

export { Textarea };
