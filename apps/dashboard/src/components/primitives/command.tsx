import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import * as React from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/primitives/dialog';
import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { cn } from '@/utils/ui';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'bg-background text-foreground-950 flex h-full w-full flex-col overflow-hidden rounded-md',
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>Command</DialogTitle>
        </VisuallyHidden>
        <Command className="**:[[cmdk-group-heading]]:text-foreground-400 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 **:[[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

type CommandInputProps = Omit<React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>, 'size'> & {
  size?: 'sm' | 'md' | 'xs';
  inputWrapperClassName?: string;
  inputRootClassName?: string;
  inlineLeadingNode?: React.ReactNode;
  hasError?: boolean;
};

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  (
    { className, size = 'md', inputRootClassName, inputWrapperClassName, inlineLeadingNode, hasError, ...props },
    ref
  ) => (
    <InputRoot className={inputRootClassName} size={size} hasError={hasError}>
      <InputWrapper
        className={cn(
          size === 'md' && 'h-10',
          size === 'sm' && 'h-[2.35rem]',
          size === 'xs' && 'h-8',
          inputWrapperClassName
        )}
      >
        {inlineLeadingNode}
        <CommandPrimitive.Input
          ref={ref}
          className={cn(
            'w-full bg-transparent outline-none text-text-strong',
            'placeholder:select-none placeholder:text-text-soft placeholder:transition placeholder:duration-200 placeholder:ease-out',
            'group-hover/input-wrapper:placeholder:text-text-sub',
            'focus:placeholder:text-text-sub',
            size === 'md' && 'h-10 text-paragraph-sm',
            size === 'sm' && 'h-[2.35rem] text-paragraph-xs',
            size === 'xs' && 'h-8 text-paragraph-xs',
            className
          )}
          {...props}
        />
      </InputWrapper>
    </InputRoot>
  )
);

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />);

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'text-foreground **:[[cmdk-group-heading]]:text-foreground-400 overflow-hidden p-1 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium',
      className
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn('bg-border -mx-1 h-px', className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    style={{ wordBreak: 'break-all' }}
    className={cn(
      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-hidden data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={cn('text-foreground-400 ml-auto text-xs tracking-widest', className)} {...props} />;
};

CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
