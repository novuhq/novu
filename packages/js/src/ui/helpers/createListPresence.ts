import { type Accessor, createEffect, createMemo, createSignal, on, onCleanup, untrack } from 'solid-js';
import type { MotionMode } from '../core/motion/mode';

/**
 * - `reset`: the list is loading again (a filter or tab change, a refetch); render the new keys, no motion.
 * - `swap`: the list starts loading other content while it shows items. They stay, inert, while the whole list fades
 *   out; then it renders what it has by then (its placeholder, or the new items) and fades back in.
 * - `load`: the first keys after a (re)load.
 * - `replace`: the keys were swapped wholesale.
 * - `update`: the usual case; removed keys leave with an exit, keys inserted at the top enter. Keys removed together,
 *   as by read all or archive all, leave one after another.
 */
export type ListChangeKind = 'reset' | 'swap' | 'load' | 'replace' | 'update';

export type ListPlan<K> = {
  kind: ListChangeKind;
  /** What to render: the new keys, plus leaving keys kept where they were. */
  rendered: readonly K[];
  leaving: ReadonlySet<K>;
  entering: readonly K[];
};

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
  /** The list can fade out as a whole when it starts loading other content (see `swap`). */
  canSwap?: boolean;
  /** A swap runs: the items it holds stay until it ends, whatever the keys do meanwhile. */
  swapping?: boolean;
};

/** Decides how the list moves from what it renders now to `next`. Pure, so every case can be tested on its own. */
export const planListChange = <K>(input: ListChangeInput<K>): ListPlan<K> => {
  const settle = (kind: ListChangeKind): ListPlan<K> => ({
    kind,
    rendered: input.next,
    leaving: new Set(),
    entering: [],
  });
  const swap = (): ListPlan<K> => ({
    kind: 'swap',
    rendered: input.rendered,
    leaving: new Set(input.rendered),
    entering: [],
  });

  if (input.swapping) {
    return swap();
  }
  if (!input.ready) {
    const showsItems = input.rendered.length > input.leaving.size;

    return input.canSwap && input.wasReady && input.motion !== 'off' && showsItems ? swap() : settle('reset');
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

/** Items that leave in one change go one after another, top first, this far apart. */
export const EXIT_STAGGER_MS = 30;
/** Items past this many leave with the last delay, so a long bulk action doesn't drag on. */
const MAX_STAGGER_STEPS = 4;

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
  /** Starts the exit of an item after `delay` ms and returns it; `undefined` removes the item at once. */
  exit: (item: HTMLElement, motion: MotionMode, delay: number) => Animation | undefined;
  enter: (item: HTMLElement, motion: MotionMode) => void;
  /** An item starts leaving, right before it turns inert: move focus out of it, stop tracking it. */
  onLeave?: (key: K, item: HTMLElement) => void;
  /** A leaving item came back before its exit ended. */
  onRestore?: (key: K, item: HTMLElement) => void;
  /**
   * Fades the whole list out when it starts loading other content, holding the last frame until it is cancelled.
   * Without it, or when it returns `undefined`, the list shows its placeholder at once.
   */
  exitList?: (motion: MotionMode) => Animation | undefined;
  /**
   * Fades the whole list in: when new items replace others without per-item motion (`load`, `replace`), when a swap
   * ends, whatever the list shows then, and when the last item has left, for the empty state.
   */
  enterList?: (kind: ListChangeKind) => void;
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
 * When the list starts loading other content (a filter change, a refetch), its items fade out together first.
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
          canSwap: options.exitList !== undefined,
          swapping: previous.plan.kind === 'swap' && rendered.length > 0,
        });

        // The list counts as loading until a swap ends, so the content it shows then arrives as a fresh `load`.
        return { plan, wasReady: plan.kind === 'swap' ? false : ready };
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

  // An exit ends early when its key came back, or when a reset flushed it.
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

  /** Returns whether the item animates out; one that is off screen, or can't animate, goes at once. */
  const startExit = (key: K, motion: MotionMode, delay: number): boolean => {
    const item = elements.get(key);
    if (!item || motion === 'off' || !options.isOnScreen(item)) {
      drop(key);

      return false;
    }
    // Focus leaves first: once the item is inert, focus inside it would drop to the document.
    options.onLeave?.(key, item);
    markLeaving(item);
    const animation = options.exit(item, motion, delay);
    if (!animation) {
      drop(key);

      return false;
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

    return true;
  };

  let swapExit: Animation | undefined;
  let lastKind: ListChangeKind = initialPlan.kind;
  let lastCount = 0;

  // Every item the swap held goes at once; the ones the new content has too come back in `restoreSwapped`.
  const endSwap = () => {
    // Drops the held last frame. The list fades back in with its new content right after, before the next paint.
    swapExit?.cancel();
    swapExit = undefined;
    for (const key of untrack(rendered)) {
      finished.add(key);
    }
    setDropTick((tick) => tick + 1);
  };

  const startSwap = (plan: ListPlan<K>, motion: MotionMode) => {
    if (swapExit) {
      return;
    }
    for (const key of plan.rendered) {
      const item = elements.get(key);
      if (item && !exits.has(key)) {
        options.onLeave?.(key, item);
        markLeaving(item);
      }
    }
    const animation = options.exitList?.(motion);
    if (!animation) {
      endSwap();

      return;
    }
    swapExit = animation;
    animation.finished.then(
      () => {
        if (swapExit === animation) {
          endSwap();
        }
      },
      () => {}
    );
  };

  // `For` keeps the element of a key that the new content has too, so it has to become live again.
  const restoreSwapped = (plan: ListPlan<K>) => {
    for (const key of plan.rendered) {
      const item = elements.get(key);
      if (item?.hasAttribute('data-leaving') && !exits.has(key)) {
        restoreItem(item);
        options.onRestore?.(key, item);
      }
    }
  };

  onCleanup(() => swapExit?.cancel());

  const moveItems = (plan: ListPlan<K>, motion: MotionMode) => {
    // `leaving` follows the list order, so a bulk action sweeps the visible items out from the top. `reduced` motion
    // fades them together.
    let step = 0;
    for (const key of plan.leaving) {
      if (!exits.has(key)) {
        const delay = motion === 'full' ? Math.min(step, MAX_STAGGER_STEPS) * EXIT_STAGGER_MS : 0;
        if (startExit(key, motion, delay)) {
          step += 1;
        }
      }
    }

    for (const key of plan.entering) {
      const item = elements.get(key);
      if (item && options.isOnScreen(item)) {
        options.enter(item, motion);
      }
    }
  };

  createEffect(
    on(state, ({ plan }) => {
      const motion = untrack(options.motion);
      const afterSwap = lastKind === 'swap' && plan.kind !== 'swap';
      const emptied = lastCount > 0 && plan.rendered.length === 0;
      lastKind = plan.kind;
      lastCount = plan.rendered.length;
      endStaleExits(plan);

      if (plan.kind === 'swap') {
        startSwap(plan, motion);

        return;
      }
      if (afterSwap) {
        restoreSwapped(plan);
      }
      moveItems(plan, motion);

      const isFresh = plan.kind === 'load' || plan.kind === 'replace';
      if (afterSwap || (isFresh && plan.rendered.length > 0) || (emptied && plan.kind === 'update')) {
        options.enterList?.(plan.kind);
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
