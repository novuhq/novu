'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error';

type ToastItem = { id: number; message: string; variant: ToastVariant; description?: string };

const VISIBLE_MS = 4000;
const NO_TOASTS: ToastItem[] = [];

let toasts: ToastItem[] = NO_TOASTS;
let nextId = 1;
const listeners = new Set<() => void>();

function setToasts(next: ToastItem[]) {
  toasts = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Shows a short confirmation in the corner of the screen. Works from any client code; needs one `Toaster` mounted.
 * With a `description` it is the design's two-line toast (`Toast/Request access`): a title, a line under it,
 * and a dot in the variant's color instead of the icon.
 */
export function toast(message: string, variant: ToastVariant = 'success', description?: string) {
  const id = nextId++;
  setToasts([...toasts, { id, message, variant, ...(description ? { description } : {}) }]);
  setTimeout(() => setToasts(toasts.filter((item) => item.id !== id)), VISIBLE_MS);
}

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => NO_TOASTS
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-60 flex w-[calc(100%-2rem)] max-w-80 flex-col gap-2"
    >
      {items.map((item) =>
        item.description ? (
          <DescribedToast key={item.id} item={item} />
        ) : (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex animate-overlay-in items-start gap-2 rounded-lg border border-border bg-raised px-3 py-2.5 text-sm tracking-tight text-foreground shadow-2xl motion-reduce:animate-none"
          >
            {item.variant === 'error' ? (
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            ) : (
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            )}
            {item.message}
          </div>
        )
      )}
    </div>
  );
}

/** The two-line toast, which moves in from below as the design's prototype has it. */
function DescribedToast({ item }: { item: ToastItem }) {
  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex animate-rise-in items-center gap-2.5 self-end rounded-lg border border-border-strong bg-raised py-2.5 pr-4 pl-3.5 shadow-[0_8px_24px_rgb(0_0_0/0.4)] motion-reduce:animate-none"
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', item.variant === 'error' ? 'bg-danger' : 'bg-success')}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[13px] leading-4.5 font-medium text-foreground">{item.message}</p>
        <p className="text-xs leading-4 text-secondary">{item.description}</p>
      </div>
    </div>
  );
}
