import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { useStyle } from '../../../helpers';
import { Dots as DefaultDots } from '../../../icons';
import { NotificationStatus } from '../../../types';
import { Button, Dropdown } from '../../primitives';
import { MoreActionsOptions } from './MoreActionsOptions';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';

export const MoreActionsDropdown = () => {
  const style = useStyle();
  const { status } = useInboxContext();

  return (
    <Show when={status() !== NotificationStatus.ARCHIVED && status() !== NotificationStatus.SNOOZED}>
      <Dropdown.Root>
        <Dropdown.Trigger
          class={style('moreActions__dropdownTrigger')}
          asChild={(triggerProps) => (
            <Button variant="ghost" size="iconSm" {...triggerProps}>
              <IconRendererWrapper
                iconKey="dots"
                class={style('moreActions__dots', 'nt-size-5', {
                  iconKey: 'dots',
                })}
                fallback={
                  <DefaultDots
                    class={style('moreActions__dots', 'nt-size-5', {
                      iconKey: 'dots',
                    })}
                  />
                }
              />
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
