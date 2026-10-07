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
  children: ReactNode;
};

/** A panel that slides in from the right over the page, used for the channel and connect flows. */
export function DrawerContent({ title, description, eyebrow, icon, footer, className, children }: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-background/70 motion-reduce:animate-none" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-120 animate-drawer-in flex-col border-l border-border bg-subtle shadow-2xl motion-reduce:animate-none',
          className
        )}
      >
        <header className="flex items-start gap-3 border-b border-border p-5">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {eyebrow && <p className="font-mono text-[11px] tracking-wider text-muted uppercase">{eyebrow}</p>}
            <DialogPrimitive.Title className="text-base font-medium tracking-tight text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm tracking-tight text-secondary">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close aria-label="Close" className={buttonClassName('ghost', '-mt-1 -mr-1.5')}>
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        </header>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-border p-5">{footer}</footer>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
