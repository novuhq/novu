import { createEffect, createMemo, createSignal, For, JSX, Show } from 'solid-js';

import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { useInboxContext, useLocalization } from '../../context';
import { cn, formatSnoozedUntil, formatToRelativeTime, useStyle } from '../../helpers';
import { Clock as DefaultClock } from '../../icons/Clock';
import {
  type BodyRenderer,
  type NotificationActionClickHandler,
  type NotificationClickHandler,
  type SubjectRenderer,
} from '../../types';
import Markdown from '../elements/Markdown';
import { ExternalElementRenderer } from '../ExternalElementRenderer';
import { Button } from '../primitives';
import { Badge } from '../primitives/Badge';
import { renderNotificationActions } from './NotificationActions';
import { IconRendererWrapper } from '../shared/IconRendererWrapper';

type DefaultNotificationProps = {
  notification: Notification;
  renderSubject?: SubjectRenderer;
  renderBody?: BodyRenderer;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();
  const { t, locale } = useLocalization();
  const { navigate, status } = useInboxContext();
  const [minutesPassed, setMinutesPassed] = createSignal(0);

  const deliveredAtIconClass = style('notificationDeliveredAt__icon', 'nt-size-3', {
    iconKey: 'clock',
  });

  const snoozedUntilIconClass = style('notificationSnoozedUntil__icon', 'nt-size-3', {
    iconKey: 'clock',
  });

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

  const handleNotificationClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!props.notification.isRead) {
      await props.notification.read();
    }

    props.onNotificationClick?.(props.notification);

    navigate(props.notification.redirect?.url, props.notification.redirect?.target);
  };

  const handleActionButtonClick = async (action: ActionTypeEnum, e: MouseEvent) => {
    e.stopPropagation();

    if (action === ActionTypeEnum.PRIMARY) {
      await props.notification.completePrimary();
      props.onPrimaryActionClick?.(props.notification);

      navigate(props.notification.primaryAction?.redirect?.url, props.notification.primaryAction?.redirect?.target);
    } else {
      await props.notification.completeSecondary();
      props.onSecondaryActionClick?.(props.notification);

      navigate(props.notification.secondaryAction?.redirect?.url, props.notification.secondaryAction?.redirect?.target);
    }
  };

  return (
    <a
      class={style(
        'notification',
        cn(
          'nt-w-full nt-text-sm hover:nt-bg-primary-alpha-25 nt-group nt-relative nt-flex nt-items-start nt-p-4 nt-gap-2',
          '[&:not(:first-child)]:nt-border-t nt-border-neutral-alpha-100',
          {
            'nt-cursor-pointer': !props.notification.isRead || !!props.notification.redirect?.url,
          }
        )
      )}
      onClick={handleNotificationClick}
    >
      <Show
        when={props.notification.avatar}
        fallback={
          <div
            class={style('notificationImageLoadingFallback', 'nt-size-8 nt-rounded-lg nt-shrink-0 nt-aspect-square')}
          />
        }
      >
        <img
          class={style('notificationImage', 'nt-size-8 nt-rounded-lg nt-object-cover nt-aspect-square')}
          src={props.notification.avatar}
        />
      </Show>
      <div class={style('notificationContent', 'nt-flex nt-flex-col nt-gap-2 nt-w-full')}>
        <div class={style('notificationTextContainer')}>
          <Show
            when={props.renderSubject}
            fallback={
              <Show when={props.notification.subject}>
                {(subject) => (
                  <Markdown
                    appearanceKey="notificationSubject"
                    class="nt-text-start nt-font-medium nt-whitespace-pre-wrap [word-break:break-word]"
                    strongAppearanceKey="notificationSubject__strong"
                  >
                    {subject()}
                  </Markdown>
                )}
              </Show>
            }
          >
            {(renderSubject) => <ExternalElementRenderer render={(el) => renderSubject()(el, props.notification)} />}
          </Show>
          <Show
            when={props.renderBody}
            fallback={
              <Markdown
                appearanceKey="notificationBody"
                strongAppearanceKey="notificationBody__strong"
                class="nt-text-start nt-whitespace-pre-wrap nt-text-foreground-alpha-600 [word-break:break-word]"
              >
                {props.notification.body}
              </Markdown>
            }
          >
            {(renderBody) => <ExternalElementRenderer render={(el) => renderBody()(el, props.notification)} />}
          </Show>
        </div>
        <div
          class={style(
            'notificationDefaultActions',
            `nt-absolute nt-transition nt-duration-100 nt-ease-out nt-gap-0.5 nt-flex nt-shrink-0 nt-opacity-0 group-hover:nt-opacity-100 group-focus-within:nt-opacity-100 nt-justify-center nt-items-center nt-bg-background/90 nt-right-3 nt-top-3 nt-border nt-border-neutral-alpha-100 nt-rounded-lg nt-backdrop-blur-lg nt-p-0.5`
          )}
        >
          {renderNotificationActions(props.notification, status)}
        </div>
        <Show when={props.notification.primaryAction || props.notification.secondaryAction}>
          <div class={style('notificationCustomActions', 'nt-flex nt-flex-wrap nt-gap-2')}>
            <Show when={props.notification.primaryAction} keyed>
              {(primaryAction) => (
                <Button
                  appearanceKey="notificationPrimaryAction__button"
                  variant="default"
                  onClick={(e) => handleActionButtonClick(ActionTypeEnum.PRIMARY, e)}
                >
                  {primaryAction.label}
                </Button>
              )}
            </Show>
            <Show when={props.notification.secondaryAction} keyed>
              {(secondaryAction) => (
                <Button
                  appearanceKey="notificationSecondaryAction__button"
                  variant="secondary"
                  onClick={(e) => handleActionButtonClick(ActionTypeEnum.SECONDARY, e)}
                >
                  {secondaryAction.label}
                </Button>
              )}
            </Show>
          </div>
        </Show>
        <div class={style('notificationDate', 'nt-text-foreground-alpha-400 nt-flex nt-items-center nt-gap-1')}>
          <Show
            when={snoozedUntil()}
            fallback={
              <>
                <Show when={deliveredAt()} fallback={<>{createdAt()}</>}>
                  {(deliveredAt) => (
                    <Show when={deliveredAt().length >= 2}>
                      {' '}
                      <For each={deliveredAt().slice(-2)}>
                        {(date, index) => (
                          <>
                            <Show when={index() === 0}>{date} ·</Show>
                            <Show when={index() === 1}>
                              <Badge appearanceKey="notificationDeliveredAt__badge">
                                <IconRendererWrapper
                                  iconKey="clock"
                                  class={deliveredAtIconClass}
                                  fallback={<DefaultClock class={deliveredAtIconClass} />}
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
              </>
            }
          >
            {(snoozedUntil) => (
              <>
                <IconRendererWrapper
                  iconKey="clock"
                  class={snoozedUntilIconClass}
                  fallback={<DefaultClock class={snoozedUntilIconClass} />}
                />
                {t('notification.snoozedUntil')} · {snoozedUntil()}
              </>
            )}
          </Show>
        </div>
      </div>

      <Show when={!props.notification.isRead}>
        <span class={style('notificationDot', 'nt-size-1.5 nt-bg-primary nt-rounded-full nt-shrink-0')} />
      </Show>
    </a>
  );
};
