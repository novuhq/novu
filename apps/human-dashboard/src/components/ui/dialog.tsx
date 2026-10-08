'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ReactNode, useState } from 'react';

import { useMeasuredHeight } from '@/hooks/use-measured-height';
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
  /**
   * Keeps Escape and a click outside from closing it. For a request that is still running: its result or
   * its error would otherwise have nowhere to show.
   */
  locked?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * A centered modal: optional icon, title and description, then content and a bottom bar with the actions.
 * Radix keeps it mounted until the closing animation ends, so keep rendering it while the dialog closes.
 *
 * A dialog that moves to another step (a new `title`) grows or shrinks to the new height while the new
 * content fades in.
 */
export function DialogContent({
  title,
  description,
  icon,
  footer,
  locked = false,
  className,
  children,
}: DialogContentProps) {
  const [openedWith] = useState(title);
  const stepped = title !== openedWith;
  const { ref, height } = useMeasuredHeight();

  // Radix links the description by itself; without one it wants to be told so on purpose.
  const describedBy: { 'aria-describedby'?: undefined } = {};
  if (!description) {
    describedBy['aria-describedby'] = undefined;
  }

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/62 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in motion-reduce:animate-none!" />
      <DialogPrimitive.Content
        {...describedBy}
        // Focus lands on the first field. A dialog without one takes it itself: its first button would light
        // up its focus ring on every open. Tab still goes to that button first.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const panel = event.currentTarget as HTMLElement;
          (panel.querySelector<HTMLElement>('input, textarea, select') ?? panel).focus();
        }}
        onEscapeKeyDown={(event) => locked && event.preventDefault()}
        onInteractOutside={(event) => locked && event.preventDefault()}
        // The border is part of the height; the measured content isn't.
        style={height === undefined ? undefined : { height: height + 2 }}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-border bg-subtle shadow-[0_16px_48px_rgb(0_0_0/0.5)] outline-none transition-[height] duration-300 ease-out data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in motion-reduce:animate-none! motion-reduce:transition-none',
          className
        )}
      >
        <div ref={ref}>
          <div
            key={title}
            className={cn('flex flex-col gap-5 p-6', stepped && 'animate-rise-in motion-reduce:animate-none')}
          >
            <div className="flex flex-col gap-3">
              {icon}
              <DialogPrimitive.Title className="text-base leading-6 font-medium text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-[13px] leading-4.5 text-secondary">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            {children && <div className="flex flex-col gap-4">{children}</div>}
          </div>
          {footer && (
            <div className="border-t border-border bg-background px-6 py-3.5">
              <div
                key={title}
                className={cn(
                  'flex items-center justify-end gap-2',
                  stepped && 'animate-overlay-in motion-reduce:animate-none'
                )}
              >
                {footer}
              </div>
            </div>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
