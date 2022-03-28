import { Prism } from '@mantine/prism';
import { INotificationTrigger } from '@notifire/shared';
import { API_ROOT } from '../../config';
import { colors, Tabs } from '../../design-system';

export function TriggerSnippetTabs({ trigger }: { trigger: INotificationTrigger }) {
  const triggerCodeSnippet = `import { Novu } from '@novu/node'; 

const novu = new Novu('<API_KEY>');

novu.trigger('${trigger.identifier?.replace(/'/g, "\\'")}', {
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

  const prismStyles = (theme) => ({
    code: {
      fontWeight: '400',
      color: `${colors.B60} !important`,
      backgroundColor: 'transparent !important',
      border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
      borderRadius: '7px',
    },
  });

  const prismTabs = [
    {
      label: 'Node.js',
      content: (
        <Prism mt={5} styles={prismStyles} data-test-id="trigger-code-snippet" language="javascript">
          {triggerCodeSnippet}
        </Prism>
      ),
    },
    {
      label: 'Curl',
      content: (
        <Prism mt={5} styles={prismStyles} language="bash" key="2" data-test-id="trigger-curl-snippet">
          {curlSnippet}
        </Prism>
      ),
    },
  ];

  return <Tabs data-test-id="trigger-code-snippet" menuTabs={prismTabs} />;
}
