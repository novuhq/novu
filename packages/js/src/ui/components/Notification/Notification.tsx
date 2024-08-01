import { Show } from 'solid-js';
import type { Notification as NoticationType } from '../../../notifications/notification';
import { NotificationMounter } from '../../types';
import { ExternalElementMounter } from '../ExternalElementMounter';
import { DefaultNotification } from './DefaultNotification';

type NotificationProps = {
  notification: NoticationType;
  mountNotification?: NotificationMounter;
};

export const Notification = (props: NotificationProps) => {
  return (
    <Show when={props.mountNotification} fallback={<DefaultNotification notification={props.notification} />}>
      <ExternalElementMounter mount={(el) => props.mountNotification!(el, { notification: props.notification })} />
    </Show>
  );
};
