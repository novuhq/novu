import { JSX, ParentProps, Show, splitProps } from 'solid-js';
import type { AppearanceKey } from '../../../types';
import { useStyle } from '../../../helpers';
import { useTabsContext } from './TabsRoot';

type TabsContentProps = JSX.IntrinsicElements['div'] &
  ParentProps & {
    class?: string;
    value: string;
    appearanceKey?: AppearanceKey;
  };

export const TabsContent = (props: TabsContentProps) => {
  const [local, rest] = splitProps(props, ['value', 'class', 'appearanceKey', 'children']);
  const style = useStyle();
  const { activeTab } = useTabsContext();

  return (
    <Show when={activeTab() === local.value}>
      <div
        class={
          local.class
            ? local.class
            : style(local.appearanceKey || 'tabsContent', activeTab() === local.value ? 'nt-block' : 'nt-hidden')
        }
        id={`tabpanel-${local.value}`}
        role="tabpanel"
        aria-labelledby={local.value}
        data-state={activeTab() === local.value ? 'active' : 'inactive'}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
};
