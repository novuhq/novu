import * as React from 'react';

import { cn } from '@/utils/ui';
import { cva, VariantProps } from 'class-variance-authority';

const inputFieldVariants = cva(
  'text-foreground-950 flex w-full flex-nowrap items-center gap-1.5 rounded-md border bg-transparent shadow-sm transition-colors focus-within:outline-none focus-visible:outline-none hover:bg-neutral-50 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50 has-[input[value=""]]:text-foreground-400 has-[input:disabled]:bg-neutral-alpha-100 has-[input:disabled]:text-foreground-300',
  {
    variants: {
      size: {
        default: 'h-8 px-2 [&>input]:py-1.5',
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

export type InputFieldProps = { children: React.ReactNode; className?: string } & VariantProps<
  typeof inputFieldVariants
>;

const InputField = ({ children, className, size, state }: InputFieldProps) => {
  return <div className={inputFieldVariants({ size, state, className })}>{children}</div>;
};

InputField.displayName = 'InputField';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'file:text-foreground placeholder:text-foreground-400 flex h-full w-full bg-transparent text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { InputField, Input };
