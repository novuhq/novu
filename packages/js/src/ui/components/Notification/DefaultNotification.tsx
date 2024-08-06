import clsx from 'clsx';
import { JSX, Show } from 'solid-js';
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

  const handleNotificationClick: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!props.notification.isRead) {
      props.notification.read();
    }

    props.onNotificationClick?.({ notification: props.notification });
    if (props.notification.redirect?.url) {
      window.open(props.notification.redirect?.url, '_blank', 'noreferrer noopener');
    }
  };

  const handleActionButtonClick = (action: ActionTypeEnum, e: MouseEvent) => {
    e.stopPropagation();

    if (action === ActionTypeEnum.PRIMARY) {
      props.notification.completePrimary();
      props.onPrimaryActionClick?.({ notification: props.notification });
    } else {
      props.notification.completeSecondary();
      props.onSecondaryActionClick?.({ notification: props.notification });
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
              'nt-text-foreground-alpha-400 nt-shrink-0 nt-float-right nt-text-right group-hover:nt-opacity-0'
            )}
          >
            {formatToRelativeTime({ fromDate: new Date(props.notification.createdAt), locale: locale() })}
          </p>
          <div
            class={style(
              'notificationDefaultActions',
              `nt-gap-3 nt-shrink-0 nt-float-right nt-hidden group-hover:nt-flex
               nt-justify-center nt-items-center nt-absolute nt-top-0 nt-right-0
               nt-bg-background p-0.5 nt-rounded
               nt-z-50 nt-w-14`
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
                          onClick={() => {
                            props.notification.read();
                          }}
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
                        onClick={() => {
                          props.notification.unread();
                        }}
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
                        onClick={() => {
                          props.notification.archive();
                        }}
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
                      onClick={() => {
                        props.notification.unarchive();
                      }}
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
