import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        'h-8 w-full rounded bg-background px-2.5 text-[13px] leading-5 text-foreground ring-1 ring-border-strong ring-inset placeholder:text-placeholder',
        'focus-visible:shadow-[0_0_0_3px] focus-visible:shadow-accent/20 focus-visible:outline-none focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
        invalid && 'ring-danger focus-visible:shadow-danger/20 focus-visible:ring-danger',
        className
      )}
      {...rest}
    />
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  /** Help text under the input. Replaced by `error` when there is one. */
  hint?: ReactNode;
  error?: ReactNode;
  /** Renders the input; pass the given props through so the label and messages stay linked to it. */
  children: (props: { id: string; invalid: boolean; 'aria-describedby': string | undefined }) => ReactNode;
};

/** A labelled input with a hint or an error message underneath. */
export function Field({ label, required = false, hint, error, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] leading-4.5 font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="text-accent">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, invalid: Boolean(error), 'aria-describedby': message ? messageId : undefined })}
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-xs leading-4', error ? 'text-danger' : 'text-muted')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
