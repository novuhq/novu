import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';
import { Inbox } from '@novu/nextjs';
import styles from './novu-theme.module.css';

export default function NovuTheme() {
  return (
    <>
      <Title title="Novu theme" />
      <div className="h-96 w-96 overflow-y-auto">
        <Inbox
          {...novuConfig}
          appearance={{
            baseTheme: {
              variables: {
                colorBackground: '#23232B',
                colorForeground: '#FFFFFF',
                colorCounter: '#DD2476',
                colorPrimary: '#DD2476',
                colorSecondaryForeground: '#828299',
                colorNeutral: '#23232B',
              },
            },
            elements: {
              button: styles['action-button'],
              notificationPrimaryAction__button: `flex flex-center ${styles['notification-btn']} ${styles['notification-primary-action__button']}`,
              notificationSecondaryAction__button: `flex flex-center ${styles['notification-btn']} ${styles['notification-secondary-action__button']}`,
              notificationDot: {
                height: '0.5rem',
                width: '0.5rem',
                backgroundColor: '#369EFF',
                border: 'none',
              },
              bellIcon: {
                color: '#828299',
              },
              notification: styles['notification-item'],
              notificationDefaultActions: styles['notification-default-actions'],
              dropdownItem: styles['dropdown-item'],
              notificationsTabsTriggerCount: {
                background: 'linear-gradient(90deg, #dd2476 0%, #ff512f 100%)',
              },
              notificationsTabs__tabsTrigger: styles['tabs-trigger'],
              channelSwitchThumb: styles['channel-switch'],
              notificationListNewNotificationsNotice__button: {
                background: 'linear-gradient(90deg, #dd2476 0%, #ff512f 100%)',
              },
              tooltipContent: {
                backgroundColor: '#292933',
                color: '#828299',
              },
              notificationSubject: styles['notification-title'],
              notificationBody: styles['notification-content'],
              channelSwitch: styles['channel-switch'],
              workflowLabelContainer: styles['workflow-label-container'],
            },
          }}
        />
      </div>
    </>
  );
}
