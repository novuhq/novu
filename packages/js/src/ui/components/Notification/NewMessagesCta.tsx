import { Component, createMemo, JSX, Show } from 'solid-js';
import { useLocalization } from '../../context';
import { Button } from '../primitives';

export const NewMessagesCta: Component<{
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  count: number;
}> = (props) => {
  const shouldRender = createMemo(() => !!props.count);
  const { t } = useLocalization();

  return (
    <Show when={shouldRender()}>
      <Button
        appearanceKey="notificationListNewNotificationsNotice__button"
        class="nt-absolute nt-w-fit nt-top-0 nt-mx-auto nt-inset-2 nt-z-10 nt-rounded-full hover:nt-bg-primary-600 nt-animate-in nt-slide-in-from-top-2 nt-fade-in"
        onClick={props.onClick}
        data-localization="notifications.newNotifications"
      >
        {t('notifications.newNotifications', { notificationCount: props.count })}
      </Button>
    </Show>
  );
};
