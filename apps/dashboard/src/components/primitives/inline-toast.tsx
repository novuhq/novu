import { cn } from '@/utils/ui';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Button } from './button';

const inlineToastVariants = cva('flex items-center justify-between gap-3 rounded-lg border px-2 py-1.5', {
  variants: {
    variant: {
      tip: 'border-neutral-100 bg-neutral-50',
      warning: 'border-warning/20 bg-warning/10',
      success: 'border-success/20 bg-success/10',
      error: 'border-destructive/20 bg-destructive/10',
      info: 'border-information/20 bg-information/10',
    },
  },
  defaultVariants: {
    variant: 'tip',
  },
});

const VARIANT_COLORS = {
  tip: 'bg-[#717784]',
  warning: 'bg-warning',
  success: 'bg-success',
  error: 'bg-destructive',
  info: 'bg-information',
} as const;

const BUTTON_COLORS = {
  tip: 'text-[#DD2450]',
  warning: 'text-warning',
  success: 'text-success',
  error: 'text-destructive',
  info: 'text-information',
} as const;

export interface InlineToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineToastVariants> {
  title?: string;
  description?: string | React.ReactNode;
  ctaLabel?: string;
  onCtaClick?: React.MouseEventHandler<HTMLButtonElement>;
  isCtaLoading?: boolean;
  ctaClassName?: string;
}

export function InlineToast({
  className,
  variant = 'tip',
  title,
  description,
  ctaLabel,
  onCtaClick,
  isCtaLoading,
  ctaClassName,
  ...props
}: InlineToastProps) {
  const barColorClass = VARIANT_COLORS[variant || 'tip'];
  const buttonColorClass = BUTTON_COLORS[variant || 'tip'];

  return (
    <div className={cn(inlineToastVariants({ variant }), className)} {...props}>
      <div className="flex items-stretch gap-3">
        <div className={cn('w-1 rounded-full', barColorClass)} />
        <div className="text-foreground-600 py-[2px] text-xs">
          {title && <span className="text-foreground-950 font-medium">{title}</span>}
          {title && description && ' '}
          {description}
        </div>
      </div>
      {ctaLabel && (
        <Button
          variant="primary"
          mode="ghost"
          size="2xs"
          type="button"
          className={cn(
            'h-[22px] shrink-0 p-0 text-xs font-medium hover:bg-transparent',
            buttonColorClass,
            ctaClassName
          )}
          onClick={onCtaClick}
          isLoading={isCtaLoading}
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
