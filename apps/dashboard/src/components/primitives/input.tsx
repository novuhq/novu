import * as React from 'react';

import { cn } from '@/utils/ui';
import { cva, VariantProps } from 'class-variance-authority';
import { inputVariants } from '@/components/primitives/variants';

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

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(({ children, className, size, state }, ref) => {
  return (
    <div ref={ref} className={inputFieldVariants({ size, state, className })}>
      {children}
    </div>
  );
});

InputField.displayName = 'InputField';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return <input type={type} className={cn(inputVariants(), className)} ref={ref} {...props} />;
});
Input.displayName = 'Input';

export { InputField, Input };
