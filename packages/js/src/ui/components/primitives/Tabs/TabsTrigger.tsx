import { JSX, ParentProps, Ref, splitProps } from 'solid-js';
import { useStyle } from '../../../helpers';
import type { AppearanceKey } from '../../../types';
import { Button } from '../Button';
import { useTabsContext } from './TabsRoot';

type TabsTriggerProps = JSX.IntrinsicElements['button'] &
  ParentProps & {
    value: string;
    class?: string;
    appearanceKey?: AppearanceKey;
    ref?: Ref<HTMLButtonElement>;
    onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  };

export const tabsTriggerVariants = () =>
  `nt-relative nt-transition nt-outline-none nt-text-foreground-alpha-600 focus-visible:nt-outline-none ` +
  `focus-visible:nt-ring-2 focus-visible:nt-ring-primary focus-visible:nt-ring-offset-2 nt-pb-[0.625rem] ` +
  `after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 after:nt-w-full after:nt-h-[2px] ` +
  `after:nt-border-b-2 data-[state=active]:after:nt-border-primary data-[state=active]:nt-text-foreground after:nt-border-b-transparent`;

export const TabsTrigger = (props: TabsTriggerProps) => {
  const [local, rest] = splitProps(props, ['value', 'class', 'appearanceKey', 'ref', 'onClick', 'children']);
  const style = useStyle();
  const { activeTab, setActiveTab } = useTabsContext();
  const clickHandler = () => setActiveTab(local.value);

  return (
    <Button
      variant="unstyled"
      size="none"
      ref={local.ref}
      id={local.value}
      appearanceKey={local.appearanceKey ?? 'tabsTrigger'}
      class={local.class ? local.class : style(local.appearanceKey || 'tabsTrigger', tabsTriggerVariants())}
      onClick={local.onClick ?? clickHandler}
      role="tab"
      tabIndex={0}
      aria-selected={activeTab() === local.value}
      aria-controls={`tabpanel-${local.value}`}
      data-state={activeTab() === local.value ? 'active' : 'inactive'}
      {...rest}
    >
      {local.children}
    </Button>
  );
};
