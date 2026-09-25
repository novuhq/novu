import { createSignal, JSX, ParentProps, Show, splitProps } from 'solid-js';
import { cn, createPresence, useStyle } from '../../../helpers';
import type { AllAppearanceKey } from '../../../types';
import { useTabsContext } from './TabsRoot';

type TabsContentProps = JSX.IntrinsicElements['div'] &
  ParentProps & {
    class?: string;
    value: string;
    appearanceKey?: AllAppearanceKey;
  };

export const TabsContent = (props: TabsContentProps) => {
  const [local, rest] = splitProps(props, ['value', 'class', 'appearanceKey', 'children']);
  const style = useStyle();
  const { activeTab, direction } = useTabsContext();
  const isActive = () => activeTab() === local.value;
  const [element, setElement] = createSignal<HTMLDivElement>();
  // The panel of the previous tab stays, inert, while it slides out under the new one (both sit in the second row of
  // the root's grid).
  const presence = createPresence({ present: isActive, element, appear: false });

  return (
    <Show when={presence.isMounted()}>
      <div
        ref={setElement}
        class={style({
          key: local.appearanceKey || 'tabsContent',
          className: cn(local.class, 'nt-motion-page nt-row-start-2 nt-col-start-1'),
        })}
        id={`tabpanel-${local.value}`}
        role="tabpanel"
        aria-labelledby={local.value}
        data-state={isActive() ? 'active' : 'inactive'}
        // Unset until the first switch, so the tab shown on mount appears with the Inbox instead of sliding in.
        data-direction={direction()}
        inert={!isActive()}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
};
