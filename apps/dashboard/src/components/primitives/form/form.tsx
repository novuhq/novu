import * as LabelPrimitive from '@radix-ui/react-label';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { Controller, ControllerProps, FieldPath, FieldValues, FormProvider, useFormContext } from 'react-hook-form';
import { useRef, useEffect } from 'react';

import { Input } from '@/components/primitives/input';
import { Label, LabelAsterisk, LabelSub } from '@/components/primitives/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';
import { BsFillInfoCircleFill } from 'react-icons/bs';
import { RiErrorWarningFill, RiInformationLine } from 'react-icons/ri';
import { Hint, HintIcon } from '../hint';
import { FormFieldContext, FormItemContext, useFormField } from './form-context';
import { AnimatePresence } from 'motion/react';
import { motion } from 'motion/react';
import { IconType } from 'react-icons';

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
          <TooltipContent className="max-w-56 whitespace-pre-wrap">{tooltip}</TooltipContent>
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

type FormMessagePureProps = React.HTMLAttributes<HTMLParagraphElement> & { hasError?: boolean; icon?: IconType };

const FormMessagePure = React.forwardRef<HTMLParagraphElement, FormMessagePureProps>(
  ({ className, children, hasError = false, icon, ...props }, _ref) => {
    return (
      children && (
        <Hint hasError={hasError} {...props}>
          {icon && <HintIcon as={icon} />}
          {children}
        </Hint>
      )
    );
  }
);
FormMessagePure.displayName = 'FormMessagePure';

const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ children, ...rest }, ref) => {
    const { error, formMessageId } = useFormField();
    const content = error ? String(error.message) : children;
    const icon = error ? RiErrorWarningFill : RiInformationLine;

    const isFirstMount = useRef(true);
    const prevContent = useRef(content);

    useEffect(() => {
      if (content !== prevContent.current) {
        isFirstMount.current = false;
      }

      prevContent.current = content;
    }, [content]);

    return (
      <AnimatePresence mode="wait">
        {content && (
          <motion.div
            key={content ? String(content) : 'empty'}
            initial={isFirstMount.current ? false : { opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FormMessagePure ref={ref} id={formMessageId} hasError={!!error} icon={icon} {...rest}>
              {content}
            </FormMessagePure>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

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
