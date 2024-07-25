import { Show } from 'solid-js';
import { InboxNotification } from '../../../types';
import { useStyle } from '../../helpers';

type DefaultNotificationProps = {
  notification: InboxNotification;
};

//TODO: Complete the implementation
export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();

  return (
    <div class={style('notificationContainer', 'nt-w-full nt-p-6')}>
      <div class={style('notificationSubjectContainer', 'nt-flex nt-items-center nt-gap-2 nt-relative')}>
        <span
          class={style(
            'notificationDot',
            'nt-absolute -nt-left-3 nt-top-0 -nt-translate-x-1/2 nt-translate-y-1/2 nt-size-3 nt-bg-primary nt-rounded-full nt-border'
          )}
        />
        <Show when={props.notification.subject}>
          <span class={style('notificationSubject', 'nt-w-full nt-font-semibold')}>{props.notification.subject}</span>
        </Show>
        <span>{props.notification.createdAt}</span>
      </div>
      {props.notification.body}
    </div>
  );
};
