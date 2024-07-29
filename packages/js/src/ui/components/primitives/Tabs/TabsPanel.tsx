import { ParentProps, Show } from 'solid-js';
import { AppearanceKey } from '../../../context';
import { cn, useStyle } from '../../../helpers';
import { useTabsContext } from './Tabs';

type TabsPanelProps = ParentProps & {
  class?: string;
  value: string;
  appearanceKey?: AppearanceKey;
};

export const TabsPanel = (props: TabsPanelProps) => {
  const style = useStyle();
  const { activeTab } = useTabsContext();

  return (
    <Show when={activeTab() === props.value}>
      <div
        class={style(
          props.appearanceKey ?? 'tabsPanel',
          cn(activeTab() === props.value ? 'nt-block' : 'nt-hidden', props.class)
        )}
        id={`tabpanel-${props.value}`}
        role="tabpanel"
        aria-labelledby={props.value}
        data-state={activeTab() === props.value ? 'active' : 'inactive'}
      >
        {props.children}
      </div>
    </Show>
  );
};
