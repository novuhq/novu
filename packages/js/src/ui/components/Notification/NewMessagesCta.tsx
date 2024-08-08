import { JSX, Component, createEffect, createSignal, Show } from 'solid-js';
import { useLocalization } from '../../context';
import { useStyle } from '../../helpers';
import { Button } from '../primitives';

export const NewMessagesCta: Component<{
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  count: number;
}> = (props) => {
  const style = useStyle();
  const { t } = useLocalization();
  const [shouldRender, setRender] = createSignal(!!props.count);
  const onAnimationEnd = () => props.count < 1 && setRender(false);

  createEffect(() => props.count > 0 && setRender(true));

  return (
    <Show when={shouldRender()}>
      <div
        class={style(
          'notificationListNewNotificationsNoticeContainer',
          'nt-relative nt-h-0 nt-w-full nt-flex nt-justify-center nt-top-4 nt-z-10'
        )}
      >
        <Button
          appearanceKey="notificationListNewNotificationsNotice__button"
          class={`nt-sticky nt-self-center nt-rounded-full nt-mt-1 hover:nt-bg-primary-600 ${
            props.count < 1 ? 'nt-animate-fade-up nt-opacity-0' : 'nt-animate-fade-down'
          }`}
          onClick={props.onClick}
          /**
           * onAnimationEnd is is a native HTML event that is triggered when a CSS animation has completed.
           * Ref: https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event
           */
          onAnimationEnd={onAnimationEnd}
        >
          {t('notifications.newNotifications', { notificationCount: props.count })}
        </Button>
      </div>
    </Show>
  );
};
