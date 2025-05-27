import { Show } from 'solid-js';
import { useLocalization } from '../../context/LocalizationContext';
import { useStyle } from '../../helpers/useStyle';
import { Motion } from '../primitives/Motion';
import { SkeletonAvatar, SkeletonText } from '../primitives/Skeleton';
import { useInboxContext, useNovu } from '../../context';
import { Button } from '../primitives/Button';
import { Bell } from '../../icons';
import { Key } from '../../icons/Key';

type NotificationListSkeletonProps = {
  loading?: boolean;
};

export const NotificationListSkeleton = (props: NotificationListSkeletonProps) => {
  const style = useStyle();
  const { t } = useLocalization();
  const { isKeyless } = useInboxContext();

  return (
    <div
      class={style(
        'notificationListEmptyNoticeContainer',
        'nt-flex nt-flex-col nt-items-center nt-h-fit nt-w-full nt-text-sm nt-text-foreground-alpha-400 nt-text-center'
      )}
    >
      <Motion.div
        animate={{
          scale: props.loading ? 1 : 0.7,
        }}
        transition={{ duration: 0.6, easing: [0.39, 0.24, 0.3, 1], delay: 0.3 }}
        class={style('notificationList__skeleton', 'nt-flex nt-relative nt-mx-auto nt-flex-col nt-w-full nt-mb-4')}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Motion.div
            animate={{
              marginBottom: props.loading ? 0 : '16px',
              borderWidth: props.loading ? 0 : '1px',
              borderRadius: props.loading ? 0 : 'var(--nv-radius-lg)',
            }}
            transition={{ duration: 0.5, delay: 0.3, easing: 'ease-in-out' }}
            class={style(
              'notificationList__skeletonContent',
              'nt-flex nt-border-neutral-alpha-50 nt-items-center nt-gap-3 nt-p-3 nt-bg-neutral-alpha-25'
            )}
          >
            <SkeletonAvatar
              appearanceKey="notificationList__skeletonAvatar"
              class="nt-w-8 nt-h-8 nt-rounded-full nt-bg-neutral-alpha-100"
            />
            <div class={style('notificationList__skeletonItem', 'nt-flex nt-flex-col nt-gap-2 nt-flex-1')}>
              <SkeletonText
                appearanceKey="notificationList__skeletonText"
                class="nt-h-2 nt-w-1/3 nt-bg-neutral-alpha-50 nt-rounded"
              />
              <SkeletonText
                appearanceKey="notificationList__skeletonText"
                class="nt-h-2 nt-w-2/3 nt-bg-neutral-alpha-50 nt-rounded"
              />
            </div>
          </Motion.div>
        ))}
        <div
          class={style(
            'notificationListEmptyNoticeOverlay',
            'nt-absolute nt-size-full nt-z-10 nt-inset-0 nt-bg-gradient-to-b nt-from-transparent nt-to-background'
          )}
        />
      </Motion.div>
      <Show when={!props.loading}>
        <Motion.p
          initial={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
          animate={{ opacity: props.loading ? 0 : 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, easing: [0.39, 0.24, 0.3, 1], delay: 0.6 }}
          class={style('notificationListEmptyNotice', 'nt-text-center')}
        >
          {isKeyless() ? (
            <KeylessEmptyState />
          ) : (
            <p data-localization="notifications.emptyNotice">{t('notifications.emptyNotice')}</p>
          )}
        </Motion.p>
      </Show>
    </div>
  );
};

function KeylessEmptyState() {
  const style = useStyle();
  const novu = useNovu();

  return (
    <>
      <div class={style('notificationListEmptyNotice', 'nt--mt-[50px]')}>
        <p class={style('strong', 'nt-text-[#000000] nt-mb-1')}>Trigger your notification. No setup needed.</p>
        <p class={style('notificationListEmptyNotice', 'nt-mb-4')}>
          {`Temporary <Inbox />, data will expire in 24h. Connect API key to persists messages, enable
                preferences, and connect email.`}
        </p>
        <div class={style('notificationListEmptyNotice', 'nt-flex nt-gap-4 nt-justify-center')}>
          <Button
            variant="secondary"
            size="sm"
            class={style(
              'notificationListEmptyNotice',
              // eslint-disable-next-line max-len
              'nt-h-8 nt-px-4 nt-flex nt-items-center nt-justify-center nt-gap-2 nt-bg-white nt-border nt-border-neutral-alpha-100 nt-shadow-sm nt-text-[12px] nt-font-medium'
            )}
            onClick={() =>
              window.open(
                'https://go.novu.co/keyless?utm_campaign=empty-state-get_api_key',
                '_blank',
                'noopener noreferrer'
              )
            }
          >
            <Key class={style('lockIcon', 'nt-size-4 nt-mr-2')} />
            Get API key
          </Button>
          <div>
            <Button
              variant="default"
              size="sm"
              class={style(
                'notificationListEmptyNotice',
                // eslint-disable-next-line max-len
                'nt-h-8 nt-px-4 nt-flex nt-items-center nt-justify-center nt-gap-2 nt-bg-neutral-900 nt-text-white nt-shadow-sm nt-text-[12px] nt-font-medium'
              )}
              onClick={() => novu.notifications.triggerHelloWorldEvent()}
            >
              <Bell class={style('bellIcon', 'nt-size-4 nt-mr-2')} />
              Send 'Hello World!'
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
