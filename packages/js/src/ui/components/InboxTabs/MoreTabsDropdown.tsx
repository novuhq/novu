import { Accessor, Setter } from 'solid-js';
import { cn, useStyle } from 'src/ui/helpers';
import { Check, DotsMenu } from '../../icons';
import { Dropdown, dropdownItemVariants, Tabs } from '../primitives';

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
          <Tabs.Tab
            value={'...'}
            isActive={props
              .dropdownTabs()
              .map((tab) => tab.label)
              .includes(props.activeTab())}
            {...triggerProps}
          >
            <DotsMenu />
          </Tabs.Tab>
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
