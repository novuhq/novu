import { JSX, ParentProps, Ref } from 'solid-js';
import { useStyle } from '../../../helpers';
import { useTabsContext } from './Tabs';

type TabsTabProps = ParentProps & {
  value: string;
  class?: string;
  ref?: Ref<HTMLButtonElement>;
  isActive?: boolean;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
};

export const TabsTab = (props: TabsTabProps) => {
  const style = useStyle();
  const { activeTab, setActiveTab } = useTabsContext();
  const clickHandler = () => setActiveTab(props.value);

  return (
    <button
      ref={props.ref}
      id={props.value}
      class={style(
        'tabsTab',
        `nt-transition nt-outline-none focus-visible:nt-outline-none focus-visible:nt-ring-2 focus-visible:nt-ring-primary focus-visible:nt-ring-offset-2 nt-border-b-2 nt-pb-[0.625rem] ${
          props.isActive ?? activeTab() === props.value
            ? 'nt-border-primary'
            : 'nt-border-transparent nt-text-foreground-alpha-600'
        } ${props.class ?? ''}`
      )}
      onClick={props.onClick ?? clickHandler}
      role="tab"
      tabIndex={props.isActive ?? activeTab() === props.value ? 0 : -1}
      aria-selected={props.isActive ?? activeTab() === props.value}
      aria-controls={`tabpanel-${props.value}`}
    >
      {props.children}
    </button>
  );
};
