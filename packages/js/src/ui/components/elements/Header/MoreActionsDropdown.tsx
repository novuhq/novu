import { createSignal, Show } from 'solid-js';
import { useInboxContext } from '../../../context/InboxContext';
import { createPresence, useStyle } from '../../../helpers';
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

  // Archived and snoozed notifications have no bulk actions; the button fades out and back in with the status.
  const [element, setElement] = createSignal<HTMLSpanElement>();
  const presence = createPresence({
    present: () => status() !== NotificationStatus.ARCHIVED && status() !== NotificationStatus.SNOOZED,
    element,
    appear: false,
  });

  return (
    <Show when={presence.isMounted()}>
      <span
        ref={setElement}
        class="nt-inline-flex nt-motion-pop [--nv-motion-pop-scale:0.75]"
        data-state={presence.state()}
      >
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
      </span>
    </Show>
  );
};
