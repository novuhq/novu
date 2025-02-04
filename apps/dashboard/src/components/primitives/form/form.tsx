import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider } from 'react-hook-form';

import { Input } from '@/components/primitives/input';
import { Label, LabelAsterisk, LabelSub } from '@/components/primitives/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { BsFillInfoCircleFill } from 'react-icons/bs';
import { RiErrorWarningFill, RiInformationFill } from 'react-icons/ri';
import { Hint, HintIcon } from '../hint';
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
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    optional?: boolean;
    required?: boolean;
    hint?: string;
    tooltip?: string;
  }
>(({ className, optional, required, tooltip, hint, children, ...props }, ref) => {
  const { formItemId } = useFormField();

  return (
    <Label ref={ref} className={cn('text-foreground-950 flex items-center', className)} htmlFor={formItemId} {...props}>
      {children}

      {required && <LabelAsterisk />}
      {hint && <LabelSub>{hint}</LabelSub>}

      {optional && <LabelSub>(optional)</LabelSub>}
      {tooltip && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <BsFillInfoCircleFill className="text-foreground-300 ml-1 inline size-3" />
          </TooltipTrigger>
          <TooltipContent className="max-w-56">{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </Label>
  );
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

const FormMessagePure = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { error?: string }
>(({ className, children, error, id, ...props }, _ref) => {
  const body = error ? error : children;

  if (!body) {
    return null;
  }

  return (
    <Hint hasError={!!error} {...props}>
      <HintIcon as={error ? RiErrorWarningFill : RiInformationFill} />
      {body}
    </Hint>
  );
});
FormMessagePure.displayName = 'FormMessagePure';

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>((props, ref) => {
  const { error, formMessageId } = useFormField();

  return <FormMessagePure ref={ref} id={formMessageId} error={error ? String(error?.message) : undefined} {...props} />;
});
FormMessage.displayName = 'FormMessage';

const FormTextInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>((props, ref) => {
  const { error } = useFormField();

  return <Input ref={ref} hasError={!!error} {...props} />;
});
FormTextInput.displayName = 'FormTextInput';

export { Form, FormControl, FormField, FormTextInput as FormInput, FormItem, FormLabel, FormMessage, FormMessagePure };
