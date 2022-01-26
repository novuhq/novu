import { Modal, Tabs, Typography } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export function TemplateTriggerModal({
  isVisible,
  onDismiss,
  triggerSlug,
}: {
  isVisible: boolean;
  onDismiss: () => void;
  triggerSlug: string | undefined;
}) {
  const triggerCodeSnippet = `
import notifire from '@notifire/node'; 

notifire.trigger('${triggerSlug}', {
 firstName: "",
 taskName: ""
});`;

  return (
    <Modal onCancel={onDismiss} onOk={onDismiss} title={false} visible={isVisible} okText="Got it" width={1000}>
      <div data-test-id="success-trigger-modal">
        <Typography.Title level={4}>Trigger implementation code</Typography.Title>
        <Tabs defaultActiveKey="1">
          <Tabs.TabPane tab="Node.js" key="1">
            <SyntaxHighlighter language="javascript" style={dark} data-test-id="trigger-code-snippet">
              {triggerCodeSnippet}
            </SyntaxHighlighter>
          </Tabs.TabPane>
          <Tabs.TabPane tab="Curl" key="2">
            Content of Tab Pane 2
          </Tabs.TabPane>
        </Tabs>
      </div>
    </Modal>
  );
}
