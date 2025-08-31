import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { useStyle } from '../../../helpers';
import { Dots as DefaultDots } from '../../../icons';
import { NotificationStatus } from '../../../types';
import { Button, Dropdown } from '../../primitives';
import { IconRendererWrapper } from '../../shared/IconRendererWrapper';
import { MoreActionsOptions } from './MoreActionsOptions';

export const MoreActionsDropdown = () => {
  const style = useStyle();
  const { status } = useInboxContext();
  const dotsIconClass = style({
    key: 'moreActions__dots',
    className: 'nt-size-5',
    iconKey: 'dots',
  });

  return (
    <Show when={status() !== NotificationStatus.ARCHIVED && status() !== NotificationStatus.SNOOZED}>
      <Dropdown.Root>
        <Dropdown.Trigger
          class={style({
            key: 'moreActions__dropdownTrigger',
          })}
          asChild={(triggerProps) => (
            <Button variant="ghost" size="iconSm" {...triggerProps}>
              <IconRendererWrapper
                iconKey="dots"
                class={dotsIconClass}
                fallback={<DefaultDots class={dotsIconClass} />}
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
