import { JSX, ParentProps, Ref } from 'solid-js';
import { cn } from '../../../helpers';
import { AppearanceKey } from '../../../context';
import { Button } from '../Button';
import { useTabsContext } from './Tabs';

type TabsTabProps = ParentProps & {
  value: string;
  class?: string;
  appearanceKey?: AppearanceKey;
  ref?: Ref<HTMLButtonElement>;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
};

const tabsTabVariants = () =>
  `nt-relative nt-transition nt-outline-none nt-text-foreground-alpha-600 focus-visible:nt-outline-none ` +
  `focus-visible:nt-ring-2 focus-visible:nt-ring-primary focus-visible:nt-ring-offset-2 nt-pb-[0.625rem] ` +
  `after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 after:nt-w-full after:nt-h-[2px] ` +
  `after:nt-border-b-2 aria-selected:after:nt-border-primary after:nt-border-b-transparent`;

export const TabsTab = (props: TabsTabProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const clickHandler = () => setActiveTab(props.value);

  return (
    <Button
      variant="unstyled"
      size="none"
      ref={props.ref}
      id={props.value}
      appearanceKey={props.appearanceKey ?? 'tabsTab'}
      class={cn(tabsTabVariants(), props.class)}
      onClick={props.onClick ?? clickHandler}
      role="tab"
      tabIndex={0}
      aria-selected={activeTab() === props.value}
      aria-controls={`tabpanel-${props.value}`}
    >
      {props.children}
    </Button>
  );
};
