import { JSX, ParentProps, Show, splitProps } from 'solid-js';
import { cn, useStyle } from '../../../helpers';
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

  return (
    <Show when={activeTab() === local.value}>
      <div
        class={style({
          key: local.appearanceKey || 'tabsContent',
          className: cn(local.class, 'nt-motion-fade', activeTab() === local.value ? 'nt-block' : 'nt-hidden'),
        })}
        id={`tabpanel-${local.value}`}
        role="tabpanel"
        aria-labelledby={local.value}
        data-state={activeTab() === local.value ? 'active' : 'inactive'}
        // Fades in when the user switches to it; the tab shown on mount appears with the Inbox.
        data-animate={direction() ? '' : undefined}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
};
