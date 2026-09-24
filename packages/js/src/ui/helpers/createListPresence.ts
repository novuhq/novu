import { type Accessor, createEffect, createMemo, createSignal, on, onCleanup, untrack } from 'solid-js';
import type { MotionMode } from '../core/motion/mode';

/**
 * - `reset`: the list is loading again (a filter or tab change, a refetch); render the new keys, no motion.
 * - `load`: the first keys after a (re)load.
 * - `bulk`: many keys went at once (read all, archive all).
 * - `replace`: the keys were swapped wholesale.
 * - `update`: the usual case; removed keys leave with an exit, keys inserted at the top enter.
 */
export type ListChangeKind = 'reset' | 'load' | 'bulk' | 'replace' | 'update';

export type ListPlan<K> = {
  kind: ListChangeKind;
  /** What to render: the new keys, plus leaving keys kept where they were. */
  rendered: readonly K[];
  leaving: ReadonlySet<K>;
  entering: readonly K[];
};

/** More keys than this removed in one change is a bulk action: no per-item exit. */
export const BULK_REMOVAL_THRESHOLD = 5;
/** Up to this many keys inserted at the top of the list animate in; more is a new page of data. */
export const MAX_ANIMATED_INSERTS = 3;

/**
 * The keys to render while removed keys animate out: `next` in its order, with every removed key kept in front of
 * the key that followed it in `rendered`, like React's TransitionGroup. Removed keys at the end stay right after the
 * last kept key, so a page appended during an exit lands below the leaving item.
 */
export const mergeListKeys = <K>(rendered: readonly K[], next: readonly K[]): K[] => {
  const nextKeys = new Set(next);
  const removedBefore = new Map<K, K[]>();
  let pending: K[] = [];
  let lastKept: K | undefined;
  let hasKept = false;

  for (const key of rendered) {
    if (!nextKeys.has(key)) {
      pending.push(key);
      continue;
    }
    if (pending.length > 0) {
      removedBefore.set(key, pending);
      pending = [];
    }
    lastKept = key;
    hasKept = true;
  }

  const merged: K[] = [];
  const seen = new Set<K>();
  const add = (key: K) => {
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(key);
    }
  };

  for (const key of next) {
    removedBefore.get(key)?.forEach(add);
    add(key);
    if (hasKept && key === lastKept) {
      pending.forEach(add);
    }
  }
  if (!hasKept) {
    pending.forEach(add);
  }

  return merged;
};

type ListChangeInput<K> = {
  rendered: readonly K[];
  leaving: ReadonlySet<K>;
  next: readonly K[];
  ready: boolean;
  wasReady: boolean;
  motion: MotionMode;
};

/** Decides how the list moves from what it renders now to `next`. Pure, so every case can be tested on its own. */
export const planListChange = <K>(input: ListChangeInput<K>): ListPlan<K> => {
  const settle = (kind: ListChangeKind): ListPlan<K> => ({
    kind,
    rendered: input.next,
    leaving: new Set(),
    entering: [],
  });

  if (!input.ready) {
    return settle('reset');
  }
  if (!input.wasReady) {
    return settle('load');
  }
  if (input.motion === 'off') {
    return settle('update');
  }

  const nextKeys = new Set(input.next);
  const renderedKeys = new Set(input.rendered);
  const removed = input.rendered.filter((key) => !nextKeys.has(key));
  const newlyRemoved = removed.filter((key) => !input.leaving.has(key));
  if (newlyRemoved.length > BULK_REMOVAL_THRESHOLD) {
    return settle('bulk');
  }

  const added = input.next.filter((key) => !renderedKeys.has(key));
  const settledCount = input.rendered.length - input.leaving.size;
  const firstKept = input.next.findIndex((key) => renderedKeys.has(key));
  if (
    (settledCount > 0 && firstKept === -1 && added.length > 0) ||
    (settledCount === 0 && added.length > MAX_ANIMATED_INSERTS)
  ) {
    return settle('replace');
  }

  // Inserted before everything that stays: a live notification. Pagination appends after kept keys.
  const isTopInsert =
    added.length > 0 && added.length <= MAX_ANIMATED_INSERTS && (firstKept === -1 || firstKept === added.length);

  return {
    kind: 'update',
    rendered: removed.length > 0 ? mergeListKeys(input.rendered, input.next) : input.next,
    leaving: new Set(removed),
    entering: isTopInsert ? added : [],
  };
};

const sameKeys = <K>(a: readonly K[], b: readonly K[]) =>
  a.length === b.length && a.every((key, index) => key === b[index]);

const sameSet = <K>(a: ReadonlySet<K>, b: ReadonlySet<K>) => a.size === b.size && [...a].every((key) => b.has(key));

export type ListPresenceOptions<K> = {
  keys: Accessor<readonly K[]>;
  /** False while the list loads (again); keys that change then are rendered without motion. */
  ready: Accessor<boolean>;
  motion: Accessor<MotionMode>;
  /** Whether an item is visible in the list; items outside it are added and removed without motion. */
  isOnScreen: (item: HTMLElement) => boolean;
  /** Starts the exit of an item and returns it; `undefined` removes the item at once. */
  exit: (item: HTMLElement, motion: MotionMode) => Animation | undefined;
  enter: (item: HTMLElement, motion: MotionMode) => void;
  /** An item starts leaving, right before it turns inert: move focus out of it, stop tracking it. */
  onLeave?: (key: K, item: HTMLElement) => void;
  /** A leaving item came back before its exit ended. */
  onRestore?: (key: K, item: HTMLElement) => void;
  /** The list was swapped without per-item motion (`load`, `bulk`, `replace`) and has items. */
  onSettle?: (kind: ListChangeKind) => void;
};

const markLeaving = (item: HTMLElement) => {
  item.setAttribute('inert', '');
  item.setAttribute('aria-hidden', 'true');
  item.setAttribute('data-leaving', '');
  item.style.pointerEvents = 'none';
  // Scroll anchoring must not pick an item that is collapsing.
  item.style.setProperty('overflow-anchor', 'none');
};

const restoreItem = (item: HTMLElement) => {
  item.removeAttribute('inert');
  item.removeAttribute('aria-hidden');
  item.removeAttribute('data-leaving');
  for (const property of ['pointer-events', 'overflow-anchor', 'overflow', 'height', 'opacity', 'transform']) {
    item.style.removeProperty(property);
  }
};

/**
 * Keeps removed items of a keyed list rendered while they animate out, and animates items inserted at the top in.
 *
 * Render `rendered()` with a keyed `For` and pass every item element to `register`. The rendered keys are derived
 * in the same reactive pass as `keys`: if `For` saw a key disappear even once it would dispose the item, and with
 * it any host content in the item, before the exit could start.
 */
export const createListPresence = <K>(options: ListPresenceOptions<K>) => {
  const elements = new Map<K, HTMLElement>();
  const exits = new Map<K, Animation>();
  const finished = new Set<K>();
  const [dropTick, setDropTick] = createSignal(0);

  const initialPlan: ListPlan<K> = { kind: 'reset', rendered: [], leaving: new Set(), entering: [] };
  const state = createMemo<{ plan: ListPlan<K>; wasReady: boolean }>(
    (previous) => {
      dropTick();
      const next = options.keys();
      const ready = options.ready();

      return untrack(() => {
        const rendered = previous.plan.rendered.filter((key) => !finished.has(key));
        const leaving = new Set([...previous.plan.leaving].filter((key) => !finished.has(key)));
        finished.clear();
        const plan = planListChange({
          rendered,
          leaving,
          next,
          ready,
          wasReady: previous.wasReady,
          motion: options.motion(),
        });

        return { plan, wasReady: ready };
      });
    },
    { plan: initialPlan, wasReady: false }
  );

  const rendered = createMemo(() => state().plan.rendered, [], { equals: sameKeys });
  const leaving = createMemo(() => state().plan.leaving, new Set<K>(), { equals: sameSet });

  const drop = (key: K) => {
    finished.add(key);
    setDropTick((tick) => tick + 1);
  };

  // An exit ends early when its key came back, or when a reset or a bulk change flushed it.
  const endStaleExits = (plan: ListPlan<K>) => {
    for (const [key, animation] of exits) {
      if (plan.leaving.has(key)) {
        continue;
      }
      exits.delete(key);
      animation.cancel();
      const item = elements.get(key);
      if (item && plan.rendered.includes(key)) {
        restoreItem(item);
        options.onRestore?.(key, item);
      }
    }
  };

  const startExit = (key: K, motion: MotionMode) => {
    const item = elements.get(key);
    if (!item || motion === 'off' || !options.isOnScreen(item)) {
      drop(key);

      return;
    }
    // Focus leaves first: once the item is inert, focus inside it would drop to the document.
    options.onLeave?.(key, item);
    markLeaving(item);
    const animation = options.exit(item, motion);
    if (!animation) {
      drop(key);

      return;
    }
    exits.set(key, animation);
    animation.finished.then(
      () => {
        if (exits.get(key) === animation) {
          exits.delete(key);
          drop(key);
        }
      },
      () => {}
    );
  };

  createEffect(
    on(state, ({ plan }) => {
      const motion = untrack(options.motion);
      endStaleExits(plan);

      for (const key of plan.leaving) {
        if (!exits.has(key)) {
          startExit(key, motion);
        }
      }

      for (const key of plan.entering) {
        const item = elements.get(key);
        if (item && options.isOnScreen(item)) {
          options.enter(item, motion);
        }
      }

      if (plan.kind !== 'update' && plan.kind !== 'reset' && plan.rendered.length > 0) {
        options.onSettle?.(plan.kind);
      }
    })
  );

  const register = (key: K, item: HTMLElement) => {
    elements.set(key, item);
    onCleanup(() => {
      if (elements.get(key) === item) {
        elements.delete(key);
      }
      const animation = exits.get(key);
      if (animation) {
        exits.delete(key);
        animation.cancel();
      }
    });
  };

  return {
    rendered,
    isLeaving: (key: K) => leaving().has(key),
    register,
  };
};
