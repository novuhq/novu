import { useStyle } from '../../../helpers';
import { DotsMenu } from '../../../icons';
import { Button, Dropdown } from '../../primitives';
import { MoreActionsOptions } from './MoreActionsOptions';

export const MoreActionsDropdown = () => {
  const style = useStyle();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        class={style('actions__dropdownTrigger')}
        asChild={(triggerProps) => (
          <Button variant="ghost" size="icon" {...triggerProps}>
            <DotsMenu />
          </Button>
        )}
      />
      <Dropdown.Content appearanceKey="actions__dropdownContent">
        <MoreActionsOptions />
      </Dropdown.Content>
    </Dropdown.Root>
  );
};
