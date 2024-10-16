import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider } from 'react-hook-form';

import { cn } from '@/utils/ui';
import { Label } from '@/components/primitives/label';
import { cva } from 'class-variance-authority';
import { RiInformationFill } from 'react-icons/ri';
import { FormFieldContext, FormItemContext, useFormField } from './form-context';

const Form = FormProvider;

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-1', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField();

  return <Label ref={ref} className={className} htmlFor={formItemId} {...props} />;
});
FormLabel.displayName = 'FormLabel';

const FormControl = React.forwardRef<React.ElementRef<typeof Slot>, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    );
  }
);
FormControl.displayName = 'FormControl';

const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField();

    return (
      <p ref={ref} id={formDescriptionId} className={cn('text-muted-foreground text-[0.8rem]', className)} {...props} />
    );
  }
);
FormDescription.displayName = 'FormDescription';

const formMessageVariants = cva('flex items-center gap-1', {
  variants: {
    variant: {
      default: '[&>svg]:text-neutral-400 [&>span]:text-foreground-600',
      error: '[&>svg]:text-destructive [&>span]:text-destructive',
    },
  },
});

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message) : children;

    if (!body) {
      return null;
    }

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={formMessageVariants({ variant: error ? 'error' : 'default', className })}
        {...props}
      >
        <RiInformationFill className="size-4" />
        <span className="mt-[1px] text-xs leading-3">{body}</span>
      </p>
    );
  }
);
FormMessage.displayName = 'FormMessage';

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField };
