import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';
import { IconType } from 'react-icons';
import { AUTOCOMPLETE_PASSWORD_MANAGERS_OFF } from '../../utils/constants';

const INPUT_ROOT_NAME = 'InputRoot';
const INPUT_WRAPPER_NAME = 'InputWrapper';
const INPUT_EL_NAME = 'InputEl';
const INPUT_ICON_NAME = 'InputIcon';
const INPUT_AFFIX_NAME = 'InputAffixButton';
const INPUT_INLINE_AFFIX_NAME = 'InputInlineAffixButton';

export const inputVariants = tv({
  slots: {
    root: [
      // base
      'ring-stroke-soft',
      'group relative flex w-full overflow-hidden bg-bg-white-0 text-text-strong shadow-xs',
      'transition duration-200 ease-out',
      'divide-x divide-stroke-soft',
      // before
      'before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft',
      'before:pointer-events-none before:rounded-[inherit]',
      'before:transition before:duration-200 before:ease-out',
      // hover
      'hover:shadow-none',
      // focus
      'has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong',
      'focus-within:shadow-button-important-focus focus-within:before:ring-stroke-strong',
      // disabled
      'has-[input:disabled]:shadow-none',
    ],
    wrapper: [
      // base
      'group/input-wrapper flex w-full cursor-text items-center bg-bg-white',
      'transition duration-200 ease-out',
      // hover
      'hover:[&:not(&:has(input:focus))]:bg-bg-weak',
      // disabled
      'has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak',
    ],
    input: [
      // base
      'w-full bg-transparent bg-none text-paragraph-sm text-text-strong outline-none',
      'transition duration-200 ease-out',
      // placeholder
      'placeholder:select-none placeholder:text-text-soft placeholder:transition placeholder:duration-200 placeholder:ease-out',
      // hover placeholder
      'group-hover/input-wrapper:placeholder:text-text-sub',
      // focus
      'focus:outline-none',
      // focus placeholder
      'group-has-[input:focus]:placeholder:text-text-sub',
      // disabled
      'disabled:text-text-disabled disabled:placeholder:text-text-disabled',
    ],
    icon: [
      // base
      'flex size-5 shrink-0 select-none items-center justify-center',
      'transition duration-200 ease-out',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft',
      // filled state
      'text-text-sub',
      // hover
      'group-has-[:placeholder-shown]:group-hover/input-wrapper:text-text-sub',
      // focus
      'group-has-[:placeholder-shown]:group-has-[input:focus]/input-wrapper:text-text-sub',
      // disabled
      'group-has-[input:disabled]/input-wrapper:text-text-disabled',
    ],
    affix: [
      // base
      'shrink-0 bg-bg-white text-paragraph-sm text-text-sub',
      'flex items-center justify-center truncate',
      'transition duration-200 ease-out',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft',
      // focus state
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub',
    ],
    inlineAffix: [
      // base
      'text-paragraph-sm text-text-sub',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft',
      // focus state
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub',
    ],
  },
  variants: {
    size: {
      md: {
        root: 'rounded-10',
        wrapper: 'gap-2 px-3',
        input: 'h-10',
      },
      sm: {
        root: 'rounded-lg',
        wrapper: 'gap-2 px-2.5',
        input: 'h-9 text-paragraph-xs',
        affix: 'text-paragraph-xs',
        inlineAffix: 'text-paragraph-xs',
      },
      xs: {
        root: 'rounded-lg',
        wrapper: 'gap-1.5 px-2',
        input: 'h-8 text-paragraph-xs',
        affix: 'text-paragraph-xs',
        inlineAffix: 'text-paragraph-xs',
        icon: 'size-4',
      },
      '2xs': {
        root: 'rounded-lg',
        wrapper: 'gap-1.5 px-2',
        input: 'h-7 text-paragraph-xs',
        icon: 'size-4',
      },
    },
    hasError: {
      true: {
        root: [
          // base
          'before:ring-error-base',
          // base
          'hover:before:ring-error-base hover:[&:not(&:has(input:focus)):has(>:only-child)]:before:ring-error-base',
          // focus
          'has-[input:focus]:shadow-button-error-focus has-[input:focus]:before:ring-error-base',
          'focus-within:shadow-button-error-focus focus-within:before:ring-error-base',
        ],
      },
      false: {
        root: [],
      },
    },
  },
  compoundVariants: [
    //#region affix
    {
      size: 'md',
      class: {
        affix: 'px-3',
      },
    },
    {
      size: ['sm', 'xs'],
      class: {
        affix: 'px-2.5',
      },
    },
    //#endregion
  ],
  defaultVariants: {
    size: 'sm',
  },
});

type InputSharedProps = VariantProps<typeof inputVariants>;

const InputRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    InputSharedProps & {
      asChild?: boolean;
    }
>(({ className, children, size, hasError, asChild, ...rest }, ref) => {
  const uniqueId = React.useId();
  const Component = asChild ? Slot : 'div';

  const { root } = inputVariants({
    size,
    hasError,
  });

  const sharedProps: InputSharedProps = {
    size,
    hasError,
  };

  const extendedChildren = recursiveCloneChildren(
    children as React.ReactElement[],
    sharedProps,
    [INPUT_WRAPPER_NAME, INPUT_EL_NAME, INPUT_ICON_NAME, INPUT_AFFIX_NAME, INPUT_INLINE_AFFIX_NAME],
    uniqueId,
    asChild
  );

  return (
    <Component ref={ref} className={root({ class: className })} {...rest}>
      {extendedChildren}
    </Component>
  );
});
InputRoot.displayName = INPUT_ROOT_NAME;

function InputWrapper({
  className,
  children,
  size,
  hasError,
  asChild,
  ...rest
}: React.HTMLAttributes<HTMLLabelElement> &
  InputSharedProps & {
    asChild?: boolean;
  }) {
  const Component = asChild ? Slot : 'label';

  const { wrapper } = inputVariants({
    size,
    hasError,
  });

  return (
    <Component className={wrapper({ class: className })} {...rest}>
      {children}
    </Component>
  );
}
InputWrapper.displayName = INPUT_WRAPPER_NAME;

const InputEl = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> &
    InputSharedProps & {
      asChild?: boolean;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }
>(({ className, type = 'text', size, hasError, asChild, ...rest }, forwardedRef) => {
  const Component = asChild ? Slot : 'input';

  const { input } = inputVariants({
    size,
    hasError,
  });

  return (
    <Component
      type={type}
      className={input({ class: className })}
      ref={forwardedRef}
      {...AUTOCOMPLETE_PASSWORD_MANAGERS_OFF}
      {...rest}
    />
  );
});
InputEl.displayName = INPUT_EL_NAME;

type InputProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> &
  InputSharedProps &
  Omit<React.ComponentPropsWithoutRef<typeof InputEl>, 'size'> & {
    leadingIcon?: IconType;
    trailingIcon?: IconType;
    leadingNode?: React.ReactNode;
    trailingNode?: React.ReactNode;
    inlineLeadingNode?: React.ReactNode;
    inlineTrailingNode?: React.ReactNode;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size,
      hasError,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      leadingNode,
      trailingNode,
      inlineLeadingNode,
      inlineTrailingNode,
      onChange,
      ...rest
    },
    forwardedRef
  ) => {
    return (
      <InputRoot size={size} hasError={hasError}>
        {leadingNode}
        <InputWrapper>
          {inlineLeadingNode}
          {LeadingIcon && <InputIcon as={LeadingIcon} />}
          <InputEl ref={forwardedRef} type="text" onChange={onChange} {...rest} />
          {TrailingIcon && <InputIcon as={TrailingIcon} />}
          {inlineTrailingNode}
        </InputWrapper>
        {trailingNode}
      </InputRoot>
    );
  }
);

Input.displayName = 'Input';

function InputIcon<T extends React.ElementType = 'div'>({
  size,
  hasError,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, { size?: 'md' | 'sm' | 'xs' } & Omit<InputSharedProps, 'size'>>) {
  const Component = as || 'div';
  const { icon } = inputVariants({ size, hasError });

  return <Component className={icon({ class: className })} {...rest} />;
}
InputIcon.displayName = INPUT_ICON_NAME;

function InputAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & InputSharedProps) {
  const { affix } = inputVariants({
    size,
    hasError,
  });

  return (
    <div className={affix({ class: className })} {...rest}>
      {children}
    </div>
  );
}
InputAffix.displayName = INPUT_AFFIX_NAME;

function InputInlineAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & InputSharedProps) {
  const { inlineAffix } = inputVariants({
    size,
    hasError,
  });

  return (
    <span className={inlineAffix({ class: className })} {...rest}>
      {children}
    </span>
  );
}
InputInlineAffix.displayName = INPUT_INLINE_AFFIX_NAME;

export {
  InputAffix as Affix,
  InputIcon as Icon,
  InputInlineAffix as InlineAffix,
  Input,
  InputEl as InputPure,
  InputRoot as InputRoot,
  InputWrapper as InputWrapper,
  type InputProps,
};
