import { JSX, For } from 'solid-js';
import { cn, useStyle } from '../../../helpers';
import { DotsMenu } from '../../../icons';
import { Button, Dropdown, dropdownTriggerButtonVariants } from '../../primitives';

export type Option = { label: string; leftIcon?: JSX.Element; rightIcon?: JSX.Element };

export const OptionsDropdown = (props: {
  buttonClass?: string;
  placement?: 'bottom-start' | 'bottom-end';
  options: Array<Option>;
  onClick?: (option: Option) => void;
}) => {
  const style = useStyle();

  return (
    <Dropdown.Root fallbackPlacements={['bottom', 'top']} placement={props.placement ?? 'bottom-start'}>
      <Dropdown.Trigger
        appearanceKey="optionsDropdown__dropdownTrigger"
        asChild={(triggerProps) => (
          <Button
            variant="unstyled"
            size="none"
            appearanceKey="optionsDropdown__button"
            {...triggerProps}
            class={cn(dropdownTriggerButtonVariants(), props.buttonClass)}
          >
            <DotsMenu appearanceKey="optionsDropdown__dots" />
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="optionsDropdown__dropdownContent">
        <For each={props.options}>
          {(option) => (
            <Dropdown.Item
              appearanceKey="optionsDropdown__dropdownItem"
              class="nt-flex nt-justify-between nt-gap-2"
              onClick={() => props.onClick?.(option)}
            >
              {option.leftIcon}
              <span class={style('optionsDropdown__dropdownItemLabel', 'nt-mr-auto')}>{option.label}</span>
              {option.rightIcon}
            </Dropdown.Item>
          )}
        </For>
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
