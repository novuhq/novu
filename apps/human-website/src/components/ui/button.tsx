import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'text';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'h-8 gap-1.5 rounded bg-accent px-3.5 text-[15px] font-medium tracking-tight text-on-accent hover:bg-accent/90 disabled:hover:bg-accent',
  secondary:
    'h-8 gap-1.5 rounded bg-background px-3 text-sm font-medium tracking-tight text-foreground ring-1 ring-border-strong hover:bg-raised disabled:hover:bg-background',
  danger:
    'h-8 gap-1.5 rounded bg-danger-strong px-3.5 text-[15px] font-medium tracking-tight text-on-accent hover:bg-danger-strong/90 disabled:hover:bg-danger-strong',
  ghost:
    'size-8 rounded text-secondary hover:bg-raised hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-secondary',
  outline:
    'h-8 rounded-sm px-4 font-mono text-sm tracking-tight text-foreground ring-1 ring-border hover:bg-border disabled:hover:bg-transparent',
  text: 'h-8 px-2 font-mono text-sm tracking-tight text-foreground/50 underline-offset-4 hover:text-foreground hover:underline',
};

/** Shared class names so links can look like buttons too. */
export function buttonClassName(variant: ButtonVariant, className?: string): string {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Shows the label with a pending ellipsis and blocks clicks while a request runs. */
  pending?: boolean;
};

export function Button({ variant = 'primary', pending = false, className, disabled, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClassName(variant, className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {children}
      {pending && <span aria-hidden="true">…</span>}
    </button>
  );
}
