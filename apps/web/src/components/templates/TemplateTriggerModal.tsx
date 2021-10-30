import { Modal, Tabs, Typography } from 'antd';
import { INotificationTrigger } from '@notifire/shared';
import { TriggerSnippetTabs } from './TriggerSnippetTabs';

export function TemplateTriggerModal({
  isVisible,
  onDismiss,
  trigger,
}: {
  isVisible: boolean;
  onDismiss: () => void;
  trigger: INotificationTrigger;
}) {
  return (
    <Modal onCancel={onDismiss} onOk={onDismiss} title={false} visible={isVisible} okText="Got it" width={1000}>
      <div data-test-id="success-trigger-modal">
        <Typography.Title level={4}>Trigger implementation code</Typography.Title>
        <TriggerSnippetTabs trigger={trigger} />
      </div>
    </Modal>
  );
}
