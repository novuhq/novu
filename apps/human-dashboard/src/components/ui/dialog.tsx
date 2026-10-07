'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type DialogContentProps = {
  title: string;
  description?: ReactNode;
  /** Illustration above the title, such as the mascot or a warning mark. */
  icon?: ReactNode;
  /** Actions on the right of the bottom bar. */
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/** A centered modal: optional icon, title and description, then content and a bottom bar with the actions. */
export function DialogContent({ title, description, icon, footer, className, children }: DialogContentProps) {
  // Radix links the description by itself; without one it wants to be told so on purpose.
  const describedBy: { 'aria-describedby'?: undefined } = {};
  if (!description) {
    describedBy['aria-describedby'] = undefined;
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-background/70 motion-reduce:animate-none" />
      <DialogPrimitive.Content
        {...describedBy}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-dialog-in rounded-lg border border-border bg-subtle shadow-2xl motion-reduce:animate-none',
          className
        )}
      >
        <div className="flex flex-col gap-2 p-5">
          {icon && <div className="mb-2">{icon}</div>}
          <DialogPrimitive.Title className="text-base font-medium tracking-tight text-foreground">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="text-sm leading-normal tracking-tight text-secondary">
              {description}
            </DialogPrimitive.Description>
          )}
          {children && <div className="mt-3 flex flex-col gap-4">{children}</div>}
        </div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
