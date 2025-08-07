import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import { AnimatePresence, motion } from 'motion/react';
import * as React from 'react';
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from 'react-hook-form';
import { IconType } from 'react-icons';
import { RiErrorWarningFill, RiInformationLine, RiQuestionLine } from 'react-icons/ri';
import { Input } from '@/components/primitives/input';
import { Label, LabelAsterisk, LabelSub } from '@/components/primitives/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { Hint, HintIcon } from '../hint';
import { FormFieldContext, FormItemContext, useFormField } from './form-context';

const Form = FormProvider;

const FormRoot = React.forwardRef<HTMLFormElement, React.ComponentPropsWithoutRef<'form'>>(
  ({ children, ...props }, ref) => {
    const form = useFormContext();

    return (
      <form ref={ref} data-dirty={form.formState.isDirty || undefined} {...props}>
        {children}
      </form>
    );
  }
);
FormRoot.displayName = 'FormRoot';

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
        <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
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
    tooltip?: React.ReactNode;
    tooltipContentClassName?: string;
    tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  }
>(
  (
    { className, optional, required, tooltip, hint, children, tooltipContentClassName, tooltipSide = 'top', ...props },
    ref
  ) => {
    const { formItemId } = useFormField();

    return (
      <Label
        ref={ref}
        className={cn('text-foreground-950 flex items-center', className)}
        htmlFor={formItemId}
        {...props}
      >
        {children}

        {required && <LabelAsterisk />}
        {hint && <LabelSub>{hint}</LabelSub>}

        {optional && <LabelSub>(optional)</LabelSub>}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              className="inline-flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <RiQuestionLine className="text-foreground-400 inline size-4" />
            </TooltipTrigger>
            <TooltipContent className={cn('max-w-56 whitespace-pre-wrap', tooltipContentClassName)} side={tooltipSide}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </Label>
    );
  }
);
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

type FormMessagePureProps = React.HTMLAttributes<HTMLParagraphElement> & { hasError?: boolean; icon?: IconType };

const FormMessagePure = React.forwardRef<HTMLParagraphElement, FormMessagePureProps>(
  ({ className, children, hasError = false, icon, ...props }, _ref) => {
    return (
      <AnimatePresence mode="wait">
        {children && (
          <motion.div
            key={hasError ? 'error' : 'empty'}
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Hint hasError={hasError} className={className} {...props}>
              {icon && <HintIcon as={icon} />}
              {children}
            </Hint>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
FormMessagePure.displayName = 'FormMessagePure';

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { suppressError?: boolean }
>(({ children, suppressError, ...rest }, ref) => {
  const { error, formMessageId } = useFormField();
  const content = !suppressError && error ? String(error.message) : children;
  const icon = error ? RiErrorWarningFill : RiInformationLine;

  return (
    <FormMessagePure ref={ref} id={formMessageId} hasError={!!error} icon={icon} {...rest}>
      {content}
    </FormMessagePure>
  );
});

const FormTextInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>((props, ref) => {
  const { error } = useFormField();

  return <Input ref={ref} hasError={!!error} {...props} />;
});
FormTextInput.displayName = 'FormTextInput';

export {
  Form,
  FormControl,
  FormField,
  FormTextInput as FormInput,
  FormItem,
  FormLabel,
  FormMessage,
  FormMessagePure,
  FormRoot,
};
