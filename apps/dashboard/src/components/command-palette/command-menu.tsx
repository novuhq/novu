'use client';

import { type DialogProps } from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import * as React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/primitives/dialog';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { cn } from '@/utils/ui';

const CommandDialog = ({
  children,
  className,
  overlayClassName,
  ...rest
}: DialogProps & {
  className?: string;
  overlayClassName?: string;
}) => {
  return (
    <Dialog {...rest}>
      <DialogContent
        className={cn(
          'flex h-auto w-[720px] max-w-[720px] flex-col overflow-hidden rounded-2xl p-0 border-0 shadow-lg bg-background',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          // Hide the built-in close button
          '[&>button]:hidden',
          className
        )}
      >
        <VisuallyHidden>
          <DialogTitle>Command Palette</DialogTitle>
        </VisuallyHidden>
        <Command
          className={cn(
            'divide-y divide-neutral-200',
            'grid min-h-0 auto-cols-auto grid-flow-row',
            '[&>[cmdk-label]+*]:!border-t-0'
          )}
          filter={(value, search, keywords) => {
            const extendValue = value + ' ' + (keywords?.join(' ') || '');
            if (extendValue.includes(search)) return 1;
            return 0;
          }}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof Command.Input>,
  React.ComponentPropsWithoutRef<typeof Command.Input>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <Command.Input
      ref={forwardedRef}
      className={cn(
        'w-full bg-transparent text-sm text-foreground-950 outline-none',
        'transition duration-200 ease-out',
        'placeholder:text-foreground-400',
        'focus:outline-none',
        className
      )}
      {...rest}
    />
  );
});
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ComponentRef<typeof Command.List>,
  React.ComponentPropsWithoutRef<typeof Command.List>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <Command.List
      ref={forwardedRef}
      className={cn('max-h-[400px] min-h-0 flex-1 overflow-auto', 'py-1', className)}
      {...rest}
    />
  );
});
CommandList.displayName = 'CommandList';

const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof Command.Group>,
  React.ComponentPropsWithoutRef<typeof Command.Group>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <Command.Group
      ref={forwardedRef}
      className={cn(
        'px-2 py-0',
        '[&>[cmdk-group-heading]]:text-[10px] [&>[cmdk-group-heading]]:text-text-soft',
        '[&>[cmdk-group-heading]]:px-1.5 [&>[cmdk-group-heading]]:py-2',
        '[&>[cmdk-group-heading]]:uppercase',
        className
      )}
      {...rest}
    />
  );
});
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof Command.Item>,
  React.ComponentPropsWithoutRef<typeof Command.Item> & { size?: 'small' | 'medium' }
>(({ className, size = 'small', children, ...rest }, forwardedRef) => {
  const sizeClasses = {
    small: 'px-3 py-2',
    medium: 'px-3 py-3',
  };

  return (
    <Command.Item
      ref={forwardedRef}
      className={cn(
        'flex items-center justify-between gap-3 rounded-8',
        'cursor-pointer text-paragraph-sm',
        'transition-colors duration-200',
        'data-[selected=true]:bg-[#F4F5F6]',
        'data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed',
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {children}
    </Command.Item>
  );
});
CommandItem.displayName = 'CommandItem';

const CommandItemIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, forwardedRef) => {
    return <div ref={forwardedRef} className={cn('size-5 shrink-0 text-foreground-600', className)} {...rest} />;
  }
);
CommandItemIcon.displayName = 'CommandItemIcon';

const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof Command.Empty>,
  React.ComponentPropsWithoutRef<typeof Command.Empty>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <Command.Empty
      ref={forwardedRef}
      className={cn('flex items-center justify-center py-6 text-sm text-foreground-400', className)}
      {...rest}
    />
  );
});
CommandEmpty.displayName = 'CommandEmpty';

const CommandFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={cn('flex h-12 items-center justify-between gap-3 px-3 border-t border-neutral-100', className)}
        {...rest}
      />
    );
  }
);
CommandFooter.displayName = 'CommandFooter';

const CommandFooterKeyBox = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        className={cn(
          'flex size-5 items-center justify-center rounded-6 bg-bg-weak text-text-soft',
          'ring-1 ring-inset ring-stroke-soft text-label-2xs font-mono',
          className
        )}
        {...rest}
      />
    );
  }
);
CommandFooterKeyBox.displayName = 'CommandFooterKeyBox';

export {
  CommandDialog as Dialog,
  CommandInput as Input,
  CommandList as List,
  CommandGroup as Group,
  CommandItem as Item,
  CommandItemIcon as ItemIcon,
  CommandEmpty as Empty,
  CommandFooter as Footer,
  CommandFooterKeyBox as FooterKeyBox,
};
