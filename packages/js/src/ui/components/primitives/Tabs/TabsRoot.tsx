import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  ParentProps,
  Setter,
  splitProps,
  untrack,
  useContext,
} from 'solid-js';
import { MOTION_EASING, readMotionDurationMs } from '../../../core/motion/tokens';
import { cn, useMotion, useStyle } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { useKeyboardNavigation } from './useKeyboardNavigation';

type TabsRootProps = Omit<JSX.IntrinsicElements['div'], 'onChange'> &
  ParentProps & {
    defaultValue?: string;
    value?: string;
    class?: string;
    appearanceKey?: AllAppearanceKey;
    onChange?: (value: string) => void;
  };

export type TabsDirection = 'forward' | 'backward';

type TabsContextValue = {
  activeTab: Accessor<string>;
  /** Where the last switch went, in tab order; unset until the first switch, so the initial tab doesn't animate. */
  direction: Accessor<TabsDirection | undefined>;
  setActiveTab: Setter<string>;
  visibleTabs: Accessor<string[]>;
  setVisibleTabs: Setter<string[]>;
};

const TabsContext = createContext<TabsContextValue>(undefined);

export const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabsContext must be used within an TabsContext.Provider');
  }

  return context;
};

/** The tab list takes the first row; every panel sits in the second, so a leaving panel and its successor overlap. */
export const tabsRootVariants = () => 'nt-grid nt-grid-cols-[minmax(0,1fr)] nt-grid-rows-[auto_minmax(0,1fr)]';

/**
 * Moves the underline (`::after`) of the newly active tab over from where the previous one was: it starts on the
 * previous box and eases into its own.
 */
const slideIndicator = (from: HTMLElement, to: HTMLElement) => {
  if (typeof to.animate !== 'function') {
    return;
  }
  const duration = readMotionDurationMs(to, 'slow');
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  if (duration <= 0 || start.width === 0 || end.width === 0) {
    return;
  }
  const shift = `translate(${start.left - end.left}px, ${start.bottom - end.bottom}px)`;
  to.animate(
    [
      { transformOrigin: 'left', transform: `${shift} scaleX(${start.width / end.width})` },
      { transformOrigin: 'left', transform: 'none' },
    ],
    { duration, easing: MOTION_EASING.standard, pseudoElement: '::after' }
  );
};

export const TabsRoot = (props: TabsRootProps) => {
  const [local, rest] = splitProps(props, ['defaultValue', 'value', 'class', 'appearanceKey', 'onChange', 'children']);
  const [tabsContainer, setTabsContainer] = createSignal<HTMLDivElement | undefined>();
  const [visibleTabs, setVisibleTabs] = createSignal<Array<string>>([]);
  const [activeTab, setActiveTab] = createSignal(local.defaultValue ?? '');
  const style = useStyle();
  const motion = useMotion();

  useKeyboardNavigation({ tabsContainer, activeTab, setActiveTab });

  const tabs = () => Array.from(tabsContainer()?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
  const tabIndex = (value: string) => tabs().findIndex((tab) => tab.id === value);
  // A tab picked from the overflow menu has no trigger in the row; the menu's trigger, marked with
  // `data-tabs-overflow`, shows its underline.
  const indicatorOf = (value: string) =>
    tabs().find((tab) => tab.id === value) ??
    tabsContainer()?.querySelector<HTMLElement>('[data-tabs-overflow]') ??
    undefined;
  let previousTab = activeTab();
  const direction = createMemo<TabsDirection | undefined>((current) => {
    const next = activeTab();
    const previous = previousTab;
    previousTab = next;
    if (!previous || !next || next === previous) {
      return current;
    }
    const from = tabIndex(previous);
    const to = tabIndex(next);

    // A tab picked from the overflow menu has no trigger in the row; the menu sits at its end.
    return to === -1 || (from !== -1 && to > from) ? 'forward' : 'backward';
  });

  createEffect(() => {
    if (local.value) {
      setActiveTab(local.value);
    }
  });

  createEffect(() => {
    local.onChange?.(activeTab());
  });

  // Runs once the triggers show the new state, and draws before the next paint, so the underline never jumps. The
  // previous tab is tracked here: a deferred `on()` hands the first change no previous value.
  let underlinedTab = activeTab();
  createEffect(
    on(activeTab, (next) => {
      const previous = underlinedTab;
      underlinedTab = next;
      if (!previous || next === previous || untrack(motion) !== 'full') {
        return;
      }
      const from = indicatorOf(previous);
      const to = indicatorOf(next);
      if (from && to && from !== to) {
        slideIndicator(from, to);
      }
    })
  );

  return (
    <TabsContext.Provider value={{ activeTab, direction, setActiveTab, visibleTabs, setVisibleTabs }}>
      <div
        ref={setTabsContainer}
        class={style({
          key: local.appearanceKey || 'tabsRoot',
          className: cn(tabsRootVariants(), local.class),
        })}
        {...rest}
      >
        {local.children}
      </div>
    </TabsContext.Provider>
  );
};
