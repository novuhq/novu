import { createEffect, createMemo, createSignal, JSX, Show } from 'solid-js';

import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { useInboxContext, useLocalization } from '../../context';
import { cn, formatToRelativeTime, useStyle } from '../../helpers';
import { MarkAsUnarchived } from '../../icons';
import { MarkAsArchived } from '../../icons/MarkAsArchived';
import { MarkAsRead } from '../../icons/MarkAsRead';
import { MarkAsUnread } from '../../icons/MarkAsUnread';
import { NotificationStatus, type NotificationActionClickHandler, type NotificationClickHandler } from '../../types';
import Markdown from '../elements/Markdown';
import { Button } from '../primitives';
import { Tooltip } from '../primitives/Tooltip';

type DefaultNotificationProps = {
  notification: Notification;
  onNotificationClick?: NotificationClickHandler;
  onPrimaryActionClick?: NotificationActionClickHandler;
  onSecondaryActionClick?: NotificationActionClickHandler;
};

export const DefaultNotification = (props: DefaultNotificationProps) => {
  const style = useStyle();
  const { t, locale } = useLocalization();
  const { navigate, status } = useInboxContext();
  const [minutesPassed, setMinutesPassed] = createSignal(0);
  const date = createMemo(() => {
    minutesPassed(); // register as dep

    return formatToRelativeTime({ fromDate: new Date(props.notification.createdAt), locale: locale() });
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
        fallback={<div class={style('notificationImage', 'nt-size-8 nt-rounded-lg nt-shrink-0')} />}
      >
        <img
          class={style('notificationImage', 'nt-size-8 nt-rounded-lg nt-object-cover')}
          src={props.notification.avatar}
        />
      </Show>
      <div class={style('notificationContent', 'nt-flex nt-flex-col nt-gap-2 nt-w-full')}>
        <div class={style('notificationTextContainer')}>
          <Show when={props.notification.subject}>
            {(subject) => (
              <Markdown
                appearanceKey="notificationSubject"
                class="nt-text-start nt-font-medium"
                strongAppearanceKey="notificationSubject__strong"
              >
                {subject()}
              </Markdown>
            )}
          </Show>
          <Markdown
            appearanceKey="notificationBody"
            strongAppearanceKey="notificationBody__strong"
            class="nt-text-start nt-whitespace-pre-wrap"
          >
            {props.notification.body}
          </Markdown>
        </div>
        <div
          class={style(
            'notificationDefaultActions',
            'nt-absolute nt-transition nt-duration-100 nt-ease-out nt-gap-0.5 nt-flex nt-shrink-0 nt-opacity-0 group-hover:nt-opacity-100 group-focus-within:nt-opacity-100 nt-justify-center nt-items-center nt-bg-background/90 nt-right-8 nt-top-3 nt-border nt-border-neutral-alpha-100 nt-rounded-lg nt-backdrop-blur-lg nt-p-0.5'
          )}
        >
          <Show when={status() !== NotificationStatus.ARCHIVED}>
            <Show
              when={props.notification.isRead}
              fallback={
                <Tooltip.Root>
                  <Tooltip.Trigger
                    asChild={(childProps) => (
                      <Button
                        appearanceKey="notificationRead__button"
                        size="iconSm"
                        variant="ghost"
                        {...childProps}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await props.notification.read();
                        }}
                      >
                        <MarkAsRead class={style('notificationRead__icon', 'nt-size-3')} />
                      </Button>
                    )}
                  />
                  <Tooltip.Content data-localization="notification.actions.read.tooltip">
                    {t('notification.actions.read.tooltip')}
                  </Tooltip.Content>
                </Tooltip.Root>
              }
            >
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(childProps) => (
                    <Button
                      appearanceKey="notificationUnread__button"
                      size="iconSm"
                      variant="ghost"
                      {...childProps}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await props.notification.unread();
                      }}
                    >
                      <MarkAsUnread class={style('notificationUnread__icon', 'nt-size-3')} />
                    </Button>
                  )}
                />
                <Tooltip.Content data-localization="notification.actions.unread.tooltip">
                  {t('notification.actions.unread.tooltip')}
                </Tooltip.Content>
              </Tooltip.Root>
            </Show>
          </Show>
          <Show
            when={props.notification.isArchived}
            fallback={
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(childProps) => (
                    <Button
                      appearanceKey="notificationArchive__button"
                      size="iconSm"
                      variant="ghost"
                      {...childProps}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await props.notification.archive();
                      }}
                    >
                      <MarkAsArchived class={style('notificationArchive__icon', 'nt-size-3')} />
                    </Button>
                  )}
                />
                <Tooltip.Content data-localization="notification.actions.archive.tooltip">
                  {t('notification.actions.archive.tooltip')}
                </Tooltip.Content>
              </Tooltip.Root>
            }
          >
            <Tooltip.Root>
              <Tooltip.Trigger
                asChild={(childProps) => (
                  <Button
                    appearanceKey="notificationUnarchive__button"
                    size="iconSm"
                    variant="ghost"
                    {...childProps}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await props.notification.unarchive();
                    }}
                  >
                    <MarkAsUnarchived class={style('notificationArchive__icon', 'nt-size-3')} />
                  </Button>
                )}
              />
              <Tooltip.Content data-localization="notification.actions.unarchive.tooltip">
                {t('notification.actions.unarchive.tooltip')}
              </Tooltip.Content>
            </Tooltip.Root>
          </Show>
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
        <p class={style('notificationDate', 'nt-text-foreground-alpha-400')}>{date()}</p>
      </div>

      <Show when={!props.notification.isRead}>
        <span class={style('notificationDot', 'nt-size-1.5 nt-bg-primary nt-rounded-full nt-shrink-0')} />
      </Show>
    </a>
  );
};
