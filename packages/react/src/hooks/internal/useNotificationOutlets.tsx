import type {
  AvatarRenderer as JsAvatarRenderer,
  BodyRenderer as JsBodyRenderer,
  CustomActionsRenderer as JsCustomActionsRenderer,
  DefaultActionsRenderer as JsDefaultActionsRenderer,
  NotificationRenderer as JsNotificationRenderer,
  SubjectRenderer as JsSubjectRenderer,
  NotificationActionClickHandler,
  NotificationClickHandler,
} from '@novu/js/ui';
import React, { useMemo } from 'react';
import { NotificationHandlersProvider } from '../../components/notification-item/context';
import type {
  AvatarRenderer,
  BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
  NotificationsRenderer,
  SubjectRenderer,
} from '../../utils/types';
import { useOutletRenderer } from './useOutletRenderer';

type NotificationRenderProps = {
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
  renderNotification?: NotificationsRenderer;
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
};

export type NotificationOutlets =
  | { renderNotification: JsNotificationRenderer }
  | {
      renderAvatar?: JsAvatarRenderer;
      renderSubject?: JsSubjectRenderer;
      renderBody?: JsBodyRenderer;
      renderDefaultActions?: JsDefaultActionsRenderer;
      renderCustomActions?: JsCustomActionsRenderer;
    };

/**
 * Adapts the notification render props shared by `Inbox`, `Notifications` and `InboxContent` into engine outlets.
 * `renderNotification` wins over the part renderers, exactly as the engine's prop types demand. Whatever it
 * renders sees the component's click handlers, so a `NotificationItem` inside it inherits them.
 */
export function useNotificationOutlets(props: NotificationRenderProps): NotificationOutlets {
  const { onNotificationClick, onPrimaryActionClick, onSecondaryActionClick, renderNotification: renderItem } = props;
  const handlers = useMemo(
    () => ({ onNotificationClick, onPrimaryActionClick, onSecondaryActionClick }),
    [onNotificationClick, onPrimaryActionClick, onSecondaryActionClick]
  );
  const renderNotificationWithHandlers = useMemo<NotificationsRenderer | undefined>(
    () =>
      renderItem
        ? (notification) => (
            <NotificationHandlersProvider value={handlers}>{renderItem(notification)}</NotificationHandlersProvider>
          )
        : undefined,
    [renderItem, handlers]
  );
  const renderNotification = useOutletRenderer(renderNotificationWithHandlers);
  const renderAvatar = useOutletRenderer(props.renderAvatar);
  const renderSubject = useOutletRenderer(props.renderSubject);
  const renderBody = useOutletRenderer(props.renderBody);
  const renderDefaultActions = useOutletRenderer(props.renderDefaultActions);
  const renderCustomActions = useOutletRenderer(props.renderCustomActions);

  return useMemo<NotificationOutlets>(() => {
    if (renderNotification) {
      return { renderNotification };
    }

    return { renderAvatar, renderSubject, renderBody, renderDefaultActions, renderCustomActions };
  }, [renderNotification, renderAvatar, renderSubject, renderBody, renderDefaultActions, renderCustomActions]);
}
