'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { buttonClassName } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

type DrawerContentProps = {
  title: string;
  description?: ReactNode;
  /** Small uppercase label above the title, such as "CONNECT". */
  eyebrow?: string;
  /** Logo or icon to the left of the title. */
  icon?: ReactNode;
  /** Actions on the right of the bottom bar. */
  footer?: ReactNode;
  className?: string;
  /** Other spacing for the header, the body or the bottom bar, when a flow's design differs. */
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: ReactNode;
};

/**
 * A panel that slides in from the right over the page, used for the channel and connect flows.
 * Radix keeps it mounted until the closing animation ends, so it slides back out too.
 */
export function DrawerContent({
  title,
  description,
  eyebrow,
  icon,
  footer,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  children,
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/62 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in motion-reduce:animate-none!" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        // Focus lands on the panel, not on its first button: the close button would light up its focus ring
        // on every open. Tab still goes to it first.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).focus();
        }}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-150 flex-col outline-none border-l border-border bg-subtle shadow-[0_16px_48px_rgb(0_0_0/0.5)] data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in motion-reduce:animate-none!',
          className
        )}
      >
        <header className={cn('flex items-start gap-3 px-6 pt-5.5 pb-2', headerClassName)}>
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {eyebrow && <p className="font-mono text-[11px] tracking-wider text-muted uppercase">{eyebrow}</p>}
            <DialogPrimitive.Title className="text-base leading-6 font-medium text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-xs leading-4 text-secondary">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close aria-label="Close" className={buttonClassName('ghost', '-mt-1 -mr-1.5')}>
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className={cn('flex flex-1 flex-col gap-3 overflow-y-auto px-6 pt-3 pb-6', bodyClassName)}>{children}</div>
        {footer && (
          <footer
            className={cn('flex items-center justify-end gap-2 border-t border-border px-6 py-3', footerClassName)}
          >
            {footer}
          </footer>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
