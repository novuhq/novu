import { Prism } from '@mantine/prism';
import { INotificationTrigger } from '@novu/shared';

import { API_ROOT } from '../../config';
import { colors, Tabs } from '../../design-system';

const NODE_JS = 'Node.js';
const CURL = 'Curl';

export function TriggerSnippetTabs({ trigger }: { trigger: INotificationTrigger }) {
  const { subscriberVariables: triggerSubscriberVariables = [] } = trigger || {};
  const isPassingSubscriberId = triggerSubscriberVariables?.find((el) => el.name === 'subscriberId');
  const subscriberVariables = isPassingSubscriberId
    ? [...triggerSubscriberVariables]
    : [{ name: 'subscriberId' }, ...triggerSubscriberVariables];

  const prismTabs = [
    {
      value: NODE_JS,
      content: getNodeTriggerSnippet(trigger.identifier, trigger.variables, subscriberVariables),
    },
    {
      value: CURL,
      content: getCurlTriggerSnippet(trigger.identifier, trigger.variables, subscriberVariables),
    },
  ];

  return <Tabs defaultValue={NODE_JS} data-test-id="trigger-code-snippet" menuTabs={prismTabs} />;
}

export const getNodeTriggerSnippet = (identifier, variables, subscriberVariables) => {
  const triggerCodeSnippet = `import { Novu } from '@novu/node'; 

const novu = new Novu('<API_KEY>');

novu.trigger('${identifier?.replace(/'/g, "\\'")}', {
  to: { 
    ${subscriberVariables
      ?.map((variable) => {
        return `${variable.name}: '${variable.value || '<REPLACE_WITH_DATA>'}'`;
      })
      .join(',\n    ')}
  },
  payload: {
    ${variables
      ?.map((variable) => {
        return `${variable.name}: '${variable.value || '<REPLACE_WITH_DATA>'}'`;
      })
      .join(',\n    ')} 
  }
});
`;

  return (
    <Prism mt={5} styles={prismStyles} data-test-id="trigger-code-snippet" language="javascript">
      {triggerCodeSnippet}
    </Prism>
  );
};

export const getCurlTriggerSnippet = (identifier, variables, subscriberVariables) => {
  const curlSnippet = `curl --location --request POST '${API_ROOT}/v1/events/trigger' \\
     --header 'Authorization: ApiKey <REPLACE_WITH_API_KEY>' \\
     --header 'Content-Type: application/json' \\
     --data-raw '{
        "name": "${identifier?.replace(/'/g, "\\'")}",
        "to" : {
            ${subscriberVariables
              ?.map((variable) => {
                return `"${variable.name}": "${variable.value || '<REPLACE_WITH_DATA>'}"`;
              })
              .join(',\n            ')} 
        },
        "payload": {
            ${variables
              ?.map((variable) => {
                return `"${variable.name}": "${variable.value || '<REPLACE_WITH_DATA>'}"`;
              })
              .join(',\n            ')}
        }
    }'
  `;

  return (
    <Prism mt={5} styles={prismStyles} language="bash" key="2" data-test-id="trigger-curl-snippet">
      {curlSnippet}
    </Prism>
  );
};

const prismStyles = (theme) => ({
  scrollArea: {
    border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
    borderRadius: '7px',
  },
  code: {
    fontWeight: 400,
    color: `${colors.B60} !important`,
    backgroundColor: 'transparent !important',
  },
});
