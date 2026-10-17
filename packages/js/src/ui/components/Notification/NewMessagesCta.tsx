import { Component, createMemo, createSignal, JSX, Show } from 'solid-js';
import { useLocalization } from '../../context';
import { createPresence } from '../../helpers';
import { Button } from '../primitives';

export const NewMessagesCta: Component<{
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  count: number;
}> = (props) => {
  const { t } = useLocalization();
  const [element, setElement] = createSignal<HTMLButtonElement>();
  const presence = createPresence({ present: () => props.count > 0, element });
  // Keeps the last count while the pill leaves, so it never reads "0 new notifications" on its way out.
  const shownCount = createMemo<number>((previous) => props.count || previous, props.count);

  return (
    <Show when={presence.isMounted()}>
      <Button
        ref={setElement}
        appearanceKey="notificationListNewNotificationsNotice__button"
        class="nt-absolute nt-w-fit nt-h-fit nt-top-0 nt-mx-auto nt-inset-2 nt-z-10 nt-rounded-full hover:nt-bg-primary-600 nt-motion-pill"
        data-state={presence.state()}
        onClick={props.onClick}
        data-localization="notifications.newNotifications"
      >
        {t('notifications.newNotifications', { notificationCount: shownCount() })}
      </Button>
    </Show>
  );
};
