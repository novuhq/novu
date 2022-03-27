import { Tabs } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { INotificationTrigger } from '@notifire/shared';
import { API_ROOT } from '../../../config';

export function TriggerSnippetTabs({ trigger }: { trigger: INotificationTrigger }) {
  const triggerCodeSnippet = `import { Novu } from '@novu/node'; 

const notifire = new Notifire('<API_KEY>');

notifire.trigger('${trigger.identifier?.replace(/'/g, "\\'")}', {
  $user_id: '<REPLACE_WITH_USER_ID>',
  ${trigger.variables
    .map((variable) => {
      return `${variable.name}: "<REPLACE_WITH_DATA>",`;
    })
    .join('\n  ')}
});
`;

  const curlSnippet = `curl --location --request POST '${API_ROOT}/v1/events/trigger' \\
     --header 'Authorization: ApiKey <REPLACE_WITH_API_KEY>' \\
     --header 'Content-Type: application/json' \\
     --data-raw '{
        "name": "${trigger.identifier?.replace(/'/g, "\\'")}",
        "payload": {
            "$user_id": "<REPLACE_WITH_USER_ID>",
            ${trigger.variables
              .map((variable) => {
                return `"${variable.name}": "<REPLACE_WITH_DATA>"`;
              })
              .join(',\n            ')}
        }
    }'
  `;

  return (
    <>
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Node.js" key="1">
          <SyntaxHighlighter language="javascript" style={dark} data-test-id="trigger-code-snippet">
            {triggerCodeSnippet}
          </SyntaxHighlighter>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Curl" key="2">
          <SyntaxHighlighter language="shell" style={dark} data-test-id="trigger-curl-snippet">
            {curlSnippet}
          </SyntaxHighlighter>
        </Tabs.TabPane>
      </Tabs>
    </>
  );
}
