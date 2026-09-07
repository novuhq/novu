import type { OutletHandle } from '@novu/js/ui';
import type { ReactNode } from 'react';

export type OutletRender = (...args: any[]) => ReactNode;

export type OutletEntry = {
  id: string;
  el: HTMLElement;
  render: OutletRender;
  args: unknown[];
};

export type OutletSnapshot = {
  entries: ReadonlyMap<string, OutletEntry>;
  /** Bumped when a render prop changed identity, so outlets re-render with the latest one even if they rendered first. */
  version: number;
};

let fallbackOutletCounter = 0;

/**
 * The host side of the bridge for outlets: DOM nodes the engine hands to React so React can render into them.
 *
 * One store exists per engine instance. Every mutation replaces the map, so `useSyncExternalStore` sees a new
 * snapshot only when something changed, and portals keyed by outlet id are reconciled in place.
 */
export class OutletStore {
  #entries: Map<string, OutletEntry> = new Map();
  #snapshot: OutletSnapshot = { entries: this.#entries, version: 0 };
  #listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  };

  getSnapshot = (): OutletSnapshot => this.#snapshot;

  /** Re-renders every outlet. Called when a host render prop changed identity. */
  invalidate() {
    this.#publish();
  }

  mount<TArgs extends unknown[]>(
    el: HTMLElement,
    render: (...args: TArgs) => ReactNode,
    args: TArgs
  ): OutletHandle<TArgs> {
    // engine outlets carry an id that is unique per outlet instance; anything else gets one from the host
    const id = el.dataset.novuOutlet ?? `nv-host-outlet-${fallbackOutletCounter++}`;
    this.#set({ id, el, render: render as OutletRender, args });

    return {
      update: (...nextArgs: TArgs) => {
        const current = this.#entries.get(id);
        if (!current) {
          return;
        }

        this.#set({ ...current, args: nextArgs });
      },
      unmount: () => {
        if (!this.#entries.has(id)) {
          return;
        }

        const next = new Map(this.#entries);
        next.delete(id);
        this.#entries = next;
        this.#publish();
      },
    };
  }

  #set(entry: OutletEntry) {
    const next = new Map(this.#entries);
    next.set(entry.id, entry);
    this.#entries = next;
    this.#publish();
  }

  #publish() {
    this.#snapshot = { entries: this.#entries, version: this.#snapshot.version + 1 };
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
