import { useStyle } from 'src/ui/helpers';
import { Tabs } from '../primitives';

export const InboxTab = (props: { label: string; class?: string }) => {
  const style = useStyle();

  // TODO: Replace with actual count from API
  const count = Math.floor(Math.random() * 120 + 1);
  return (
    <Tabs.Tab value={props.label} class={`nt-flex nt-gap-2 ${props.class ?? ''}`}>
      <span class={style('tabsTabLabel', 'nt-text-sm nt-font-medium')}>{props.label}</span>
      <span
        class={style('tabsTabCount', 'nt-rounded-full nt-bg-primary nt-px-[6px] nt-text-primary-foreground nt-text-sm')}
      >
        {count >= 100 ? '99+' : count}
      </span>
    </Tabs.Tab>
  );
};
