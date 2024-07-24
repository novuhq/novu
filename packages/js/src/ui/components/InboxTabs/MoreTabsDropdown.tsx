import { Accessor, Setter } from 'solid-js';
import { cn, useStyle } from 'src/ui/helpers';
import { Check, DotsMenu } from '../../icons';
import { Button, Dropdown, dropdownItemVariants, Tabs } from '../primitives';

export const MoreTabsDropdown = (props: {
  dropdownTabs: Accessor<Array<{ label: string; value: Array<string> }>>;
  activeTab: Accessor<string>;
  setActiveTab: Setter<string>;
}) => {
  const style = useStyle();

  return (
    <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement="bottom-start">
      <Dropdown.Trigger
        class={style('actions__dropdownTrigger')}
        asChild={(triggerProps) => (
          <Button
            variant="unstyled"
            size="none"
            {...triggerProps}
            class={`
              nt-relative nt-transition nt-outline-none focus-visible:nt-outline-none focus-visible:nt-ring-2 focus-visible:nt-ring-primary focus-visible:nt-ring-offset-2 nt-pb-[0.625rem] after:nt-absolute after:nt-content-[''] after:nt-bottom-0 after:nt-left-0 after:nt-w-full after:nt-h-[2px] after:nt-border-b-2
              ${
                props
                  .dropdownTabs()
                  .map((tab) => tab.label)
                  .includes(props.activeTab())
                  ? 'after:nt-border-b-primary'
                  : 'after:nt-border-b-transparent nt-text-foreground-alpha-600'
              }`}
          >
            <DotsMenu />
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="actions__dropdownContent">
        {props.dropdownTabs().map((tab) => (
          <Dropdown.Item
            class={style('actions__dropdownItem', cn(dropdownItemVariants(), 'nt-flex nt-justify-between nt-gap-2'))}
            onClick={() => props.setActiveTab(tab.label)}
          >
            <span class={style('actions__dropdownItemLabel', 'nt-mr-auto')}>{tab.label}</span>
            {tab.label === props.activeTab() && <Check class={style('actions__dropdownItemLeftIcon')} />}
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
