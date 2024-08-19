import clsx from 'clsx';
import { createEffect, createMemo, createSignal, JSX, Show } from 'solid-js';
import type { Notification } from '../../../notifications';
import { ActionTypeEnum } from '../../../types';
import { useInboxContext, useLocalization } from '../../context';
import { formatToRelativeTime, useStyle } from '../../helpers';
import { Archive, ReadAll, Unarchive, Unread } from '../../icons';
import type { NotificationActionClickHandler, NotificationClickHandler } from '../../types';
import { NotificationStatus } from '../../types';
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
  const { status } = useInboxContext();
  const [minutesPassed, setMinutesPassed] = createSignal(0);
  const date = createMemo(() => {
    minutesPassed(); //register as dep

    return formatToRelativeTime({ fromDate: new Date(props.notification.createdAt), locale: locale() });
  });

  createEffect(() => {
    const interval = setInterval(() => {
      setMinutesPassed((prev) => prev + 1);
    }, 1000 * 60);

    return () => clearInterval(interval);
  });

  const handleNotificationClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!props.notification.isRead) {
      props.notification.read();
    }

    props.onNotificationClick?.(props.notification);
    if (props.notification.redirect?.url) {
      window.open(props.notification.redirect?.url, '_blank', 'noreferrer noopener');
    }
  };

  const handleActionButtonClick = (action: ActionTypeEnum, e: MouseEvent) => {
    e.stopPropagation();

    if (action === ActionTypeEnum.PRIMARY) {
      props.notification.completePrimary();
      props.onPrimaryActionClick?.(props.notification);
    } else {
      props.notification.completeSecondary();
      props.onSecondaryActionClick?.(props.notification);
    }
  };

  return (
    <a
      class={style(
        'notification',
        clsx('nt-w-full nt-text-sm hover:nt-bg-neutral-100 nt-group nt-relative nt-flex nt-px-6 nt-py-4 nt-gap-2', {
          'nt-cursor-pointer': !props.notification.isRead || !!props.notification.redirect?.url,
        })
      )}
      onClick={handleNotificationClick}
    >
      <Show when={!props.notification.isRead}>
        <span
          class={style(
            'notificationDot',
            'nt-absolute -nt-translate-x-[150%] nt-translate-y-1/2 nt-size-2.5 nt-bg-primary nt-rounded-full nt-border'
          )}
        />
      </Show>
      <Show when={props.notification.avatar}>
        <img class={style('notificationImage', 'nt-size-8 nt-rounded-lg')} src={props.notification.avatar} />
      </Show>
      <div class={style('notificationBody', 'nt-overflow-hidden nt-w-full')}>
        {/* eslint-disable-next-line local-rules/no-class-without-style */}
        <div class="nt-relative nt-shrink-0 nt-float-right">
          <p
            class={style(
              'notificationDate',
              `nt-transition nt-duration-100 nt-ease-out nt-text-foreground-alpha-400 nt-shrink-0 
              nt-float-right nt-text-right group-hover:nt-opacity-0`
            )}
          >
            {date()}
          </p>
          <div
            class={style(
              'notificationDefaultActions',
              `nt-transition nt-duration-100 nt-ease-out nt-gap-2 nt-flex nt-shrink-0 
              nt-opacity-0 group-hover:nt-opacity-100 nt-justify-center nt-items-center 
              nt-absolute nt-top-0 nt-right-0  nt-bg-neutral-100 nt-p-0.5 nt-rounded nt-z-50`
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
                          size="icon"
                          variant="icon"
                          {...childProps}
                          onClick={(e) => {
                            e.stopPropagation();
                            props.notification.read();
                          }}
                          class="hover:nt-bg-neutral-200"
                        >
                          <ReadAll />
                        </Button>
                      )}
                    />
                    <Tooltip.Content>{t('notification.actions.read.toolTip')}</Tooltip.Content>
                  </Tooltip.Root>
                }
              >
                <Tooltip.Root>
                  <Tooltip.Trigger
                    asChild={(childProps) => (
                      <Button
                        appearanceKey="notificationUnread__button"
                        size="icon"
                        variant="icon"
                        {...childProps}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.notification.unread();
                        }}
                        class="hover:nt-bg-neutral-200"
                      >
                        <Unread />
                      </Button>
                    )}
                  />
                  <Tooltip.Content>{t('notification.actions.unread.toolTip')}</Tooltip.Content>
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
                        size="icon"
                        variant="icon"
                        {...childProps}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.notification.archive();
                        }}
                        class="hover:nt-bg-neutral-200"
                      >
                        <Archive />
                      </Button>
                    )}
                  />
                  <Tooltip.Content>{t('notification.actions.archive.toolTip')}</Tooltip.Content>
                </Tooltip.Root>
              }
            >
              <Tooltip.Root>
                <Tooltip.Trigger
                  asChild={(childProps) => (
                    <Button
                      appearanceKey="notificationUnarchive__button"
                      size="icon"
                      variant="icon"
                      {...childProps}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.notification.unarchive();
                      }}
                      class="hover:nt-bg-neutral-200"
                    >
                      <Unarchive />
                    </Button>
                  )}
                />
                <Tooltip.Content>{t('notification.actions.unarchive.toolTip')}</Tooltip.Content>
              </Tooltip.Root>
            </Show>
          </div>
        </div>
        <Show when={props.notification.subject}>
          <p class={style('notificationSubject', 'nt-font-semibold')}>{props.notification.subject}</p>
        </Show>
        <p class={style('notificationBody')}>{props.notification.body}</p>
        <div class={style('notificationCustomActions', 'nt-flex nt-gap-4 nt-mt-4')}>
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
      </div>
    </a>
  );
};
