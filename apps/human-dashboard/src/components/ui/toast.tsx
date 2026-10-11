'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useSyncExternalStore } from 'react';

type ToastVariant = 'success' | 'error';

type ToastItem = { id: number; message: string; variant: ToastVariant };

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

/** Shows a short confirmation in the corner of the screen. Works from any client code; needs one `Toaster` mounted. */
export function toast(message: string, variant: ToastVariant = 'success') {
  const id = nextId++;
  setToasts([...toasts, { id, message, variant }]);
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
      {items.map((item) => (
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
      ))}
    </div>
  );
}
