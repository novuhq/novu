import { ParentProps } from 'solid-js';
import { useStyle } from '../../../helpers';
import { useTabsContext } from './Tabs';

type TabsPanelProps = ParentProps & {
  value: string;
  class?: string;
};

export const TabsPanel = (props: TabsPanelProps) => {
  const style = useStyle();
  const { activeTab } = useTabsContext();

  return (
    <div
      class={style('tabsPanel', `${activeTab() === props.value ? 'nt-block' : 'nt-hidden'} ${props.class ?? ''}`)}
      id={`tabpanel-${props.value}`}
      role="tabpanel"
      aria-labelledby={props.value}
    >
      {props.children}
    </div>
  );
};
