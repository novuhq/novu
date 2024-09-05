import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { useStyle } from '../../../helpers';
import { Dots } from '../../../icons';
import { NotificationStatus } from '../../../types';
import { Button, Dropdown } from '../../primitives';
import { MoreActionsOptions } from './MoreActionsOptions';

export const MoreActionsDropdown = () => {
  const style = useStyle();
  const { status } = useInboxContext();

  return (
    <Show when={status() !== NotificationStatus.ARCHIVED}>
      <Dropdown.Root>
        <Dropdown.Trigger
          class={style('moreActions__dropdownTrigger')}
          asChild={(triggerProps) => (
            <Button variant="icon" size="icon" {...triggerProps}>
              <Dots class={style('moreActions__dots')} />
            </Button>
          )}
        />
        <Dropdown.Content appearanceKey="moreActions__dropdownContent">
          <MoreActionsOptions />
        </Dropdown.Content>
      </Dropdown.Root>
    </Show>
  );
};
