import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';

import type { Notification } from '../../../notifications';
import { SeverityLevelEnum } from '../../../types';
import { useInboxContext, useLocalization } from '../../context';
import { createNotificationItemController } from '../../core/item/controller';
import { notificationItemStyles, SEVERITY_TO_BAR_KEYS, SEVERITY_TO_NOTIFICATION_KEYS } from '../../core/style/tables';
import { cn, formatSnoozedUntil, formatToRelativeTime, useStyle } from '../../helpers';
import { Clock as DefaultClock } from '../../icons/Clock';
import {
  AvatarRenderer,
  type BodyRenderer,
  CustomActionsRenderer,
  DefaultActionsRenderer,
  InboxAppearanceCallback,
  type NotificationActionClickHandler,
  type NotificationClickHandler,
  type SubjectRenderer,
} from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import Markdown from '../elements/Markdown';
import { Badge } from '../primitives/Badge';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';
import { NotificationCustomActions } from './NotificationCustomActions';
import { NotificationDefaultActions } from './NotificationDefaultActions';

type DefaultNotificationProps = {
  notification: Notification;
  renderAvatar?: AvatarRenderer;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  renderDefaultActions?: DefaultActionsRenderer;
  renderCustomActions?: CustomActionsRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

const styles = notificationItemStyles;

export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();
  const { t, locale } = useLocalization();
  const { navigate } = useInboxContext();
  const [minutesPassed, setMinutesPassed] = createSignal(0);
  const controller = createNotificationItemController({
    notification: () => props.notification,
    handlers: () => props,
    navigate,
  });

  const severity = createMemo(() => props.notification.severity ?? SeverityLevelEnum.NONE);

  const createdAt = createMemo(() => {
    minutesPassed(); // register as dep

    return formatToRelativeTime({ fromDate: new Date(props.notification.createdAt), locale: locale() });
  });
  const snoozedUntil = createMemo(() => {
    minutesPassed(); // register as dep
    if (!props.notification.snoozedUntil) {
      return null;
    }

    return formatSnoozedUntil({ untilDate: new Date(props.notification.snoozedUntil), locale: locale() });
  });
  const deliveredAt = createMemo(() => {
    minutesPassed(); // register as dep

    if (!props.notification.deliveredAt || !Array.isArray(props.notification.deliveredAt)) {
      return null;
    }

    return props.notification.deliveredAt.map((date) =>
      formatToRelativeTime({ fromDate: new Date(date), locale: locale() })
    );
  });

  createEffect(() => {
    const interval = setInterval(() => {
      setMinutesPassed((prev) => prev + 1);
    }, 1000 * 60);

    return () => clearInterval(interval);
  });

  return (
    <a
      class={style({
        key: SEVERITY_TO_NOTIFICATION_KEYS[severity()],
        className: cn(styles.root.className, styles.root.severity[severity()], {
          [styles.root.clickable]: controller.isClickable(),
        }),
        context: { notification: props.notification } satisfies Parameters<InboxAppearanceCallback['notification']>[0],
      })}
      onClick={controller.handleClick}
    >
      <div
        class={style({
          key: SEVERITY_TO_BAR_KEYS[severity()],
          className: cn(styles.bar.className, styles.bar.severity[severity()]),
          context: { notification: props.notification } satisfies Parameters<
            InboxAppearanceCallback['notificationBar']
          >[0],
        })}
      />

      <Show
        when={props.renderAvatar}
        fallback={
          <Show
            when={props.notification.avatar}
            fallback={
              <div
                class={style({
                  key: styles.avatarFallback.key,
                  className: styles.avatarFallback.className,
                  context: { notification: props.notification } satisfies Parameters<
                    InboxAppearanceCallback['notificationImageLoadingFallback']
                  >[0],
                })}
              />
            }
          >
            <img
              class={style({
                key: styles.avatar.key,
                className: styles.avatar.className,
                context: { notification: props.notification } satisfies Parameters<
                  InboxAppearanceCallback['notificationImage']
                >[0],
              })}
              src={props.notification.avatar}
            />
          </Show>
        }
      >
        {(renderAvatar) => <ExternalElementRenderer render={renderAvatar()} args={[props.notification]} />}
      </Show>

      <div
        class={style({
          key: styles.content.key,
          className: styles.content.className,
          context: { notification: props.notification } satisfies Parameters<
            InboxAppearanceCallback['notificationContent']
          >[0],
        })}
      >
        <div
          class={style({
            key: styles.textContainer.key,
            context: { notification: props.notification } satisfies Parameters<
              InboxAppearanceCallback['notificationTextContainer']
            >[0],
          })}
        >
          <Show
            when={props.renderSubject}
            fallback={
              <Show when={props.notification.subject}>
                {(subject) => (
                  <Markdown
                    appearanceKey={styles.subject.key}
                    class={styles.subject.className}
                    strongAppearanceKey={styles.subject.strongKey}
                    emAppearanceKey={styles.subject.emKey}
                    context={{ notification: props.notification }}
                  >
                    {subject()}
                  </Markdown>
                )}
              </Show>
            }
          >
            {(renderSubject) => <ExternalElementRenderer render={renderSubject()} args={[props.notification]} />}
          </Show>
          <Show
            when={props.renderBody}
            fallback={
              <Markdown
                appearanceKey={styles.body.key}
                strongAppearanceKey={styles.body.strongKey}
                emAppearanceKey={styles.body.emKey}
                class={styles.body.className}
                context={{ notification: props.notification }}
              >
                {props.notification.body}
              </Markdown>
            }
          >
            {(renderBody) => <ExternalElementRenderer render={renderBody()} args={[props.notification]} />}
          </Show>
        </div>

        <Show
          when={props.renderDefaultActions}
          fallback={<NotificationDefaultActions notification={props.notification} />}
        >
          {(renderDefaultActions) => (
            <ExternalElementRenderer render={renderDefaultActions()} args={[props.notification]} />
          )}
        </Show>

        <Show
          when={props.renderCustomActions}
          fallback={
            <NotificationCustomActions
              notification={props.notification}
              onPrimaryActionClick={props.onPrimaryActionClick}
              onSecondaryActionClick={props.onSecondaryActionClick}
            />
          }
        >
          {(renderCustomActions) => (
            <ExternalElementRenderer render={renderCustomActions()} args={[props.notification]} />
          )}
        </Show>

        <div
          class={style({
            key: styles.date.key,
            className: styles.date.className,
            context: { notification: props.notification } satisfies Parameters<
              InboxAppearanceCallback['notificationDate']
            >[0],
          })}
        >
          <Show
            when={snoozedUntil()}
            fallback={
              <Show when={deliveredAt()} fallback={createdAt()}>
                {(deliveredAt) => (
                  <Show when={deliveredAt().length >= 2} fallback={createdAt()}>
                    {' '}
                    <For each={deliveredAt().slice(-2)}>
                      {(date, index) => (
                        <>
                          <Show when={index() === 0}>{date} ·</Show>
                          <Show when={index() === 1}>
                            <Badge
                              appearanceKey={styles.deliveredAtBadge.key}
                              context={{ notification: props.notification }}
                            >
                              <IconRendererWrapper
                                iconKey="clock"
                                class={style({
                                  key: styles.deliveredAtIcon.key,
                                  className: styles.deliveredAtIcon.className,
                                  iconKey: 'clock',
                                  context: { notification: props.notification } satisfies Parameters<
                                    InboxAppearanceCallback['notificationDeliveredAt__icon']
                                  >[0],
                                })}
                                fallback={
                                  <DefaultClock
                                    class={style({
                                      key: styles.deliveredAtIcon.key,
                                      className: styles.deliveredAtIcon.className,
                                      iconKey: 'clock',
                                      context: { notification: props.notification } satisfies Parameters<
                                        InboxAppearanceCallback['notificationDeliveredAt__icon']
                                      >[0],
                                    })}
                                  />
                                }
                              />
                              {date}
                            </Badge>
                          </Show>
                        </>
                      )}
                    </For>
                  </Show>
                )}
              </Show>
            }
          >
            {(snoozedUntil) => (
              <>
                <IconRendererWrapper
                  iconKey="clock"
                  class={style({
                    key: styles.snoozedUntilIcon.key,
                    className: styles.snoozedUntilIcon.className,
                    iconKey: 'clock',
                    context: { notification: props.notification } satisfies Parameters<
                      InboxAppearanceCallback['notificationSnoozedUntil__icon']
                    >[0],
                  })}
                  fallback={
                    <DefaultClock
                      class={style({
                        key: styles.snoozedUntilIcon.key,
                        className: styles.snoozedUntilIcon.className,
                        iconKey: 'clock',
                        context: { notification: props.notification } satisfies Parameters<
                          InboxAppearanceCallback['notificationSnoozedUntil__icon']
                        >[0],
                      })}
                    />
                  }
                />
                {t('notification.snoozedUntil')} · {snoozedUntil()}
              </>
            )}
          </Show>
        </div>
      </div>

      <div class={styles.dotContainer.className}>
        <Show when={!props.notification.isRead}>
          <span
            class={style({
              key: styles.dot.key,
              className: styles.dot.className,
              context: { notification: props.notification } satisfies Parameters<
                InboxAppearanceCallback['notificationDot']
              >[0],
            })}
          />
        </Show>
      </div>
    </a>
  );
};
