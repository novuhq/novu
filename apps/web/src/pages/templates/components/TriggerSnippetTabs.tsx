import { Prism } from '@mantine/prism';
import { useMemo } from 'react';
import set from 'lodash.set';
import get from 'lodash.get';

import { INotificationTrigger, INotificationTriggerVariable, TemplateVariableTypeEnum } from '@novu/shared';

import { colors, Tabs } from '@novu/design-system';
import { CodeSnippetProps, createCurlSnippet, createNodeSnippet } from '../../../utils/codeSnippets';

const NODE_JS = 'Node.js';
const CURL = 'Curl';

export function TriggerSnippetTabs({ trigger }: { trigger: INotificationTrigger }) {
  const { subscriberVariables: triggerSubscriberVariables = [], reservedVariables: triggerSnippetVariables = [] } =
    trigger || {};
  const isPassingSubscriberId = triggerSubscriberVariables?.find((el) => el.name === 'subscriberId');
  const subscriberVariables = isPassingSubscriberId
    ? [...triggerSubscriberVariables]
    : [{ name: 'subscriberId' }, ...triggerSubscriberVariables];

  const toValue = getSubscriberValue(subscriberVariables, (variable) => variable.value || '<REPLACE_WITH_DATA>');
  const payloadValue = getPayloadValue(trigger.variables);

  const reservedValue = useMemo(() => {
    return triggerSnippetVariables.reduce((prev, variable) => {
      prev[variable.type] = getPayloadValue(variable.variables);

      return prev;
    }, {});
  }, [triggerSnippetVariables]);

  const prismTabs = [
    {
      value: NODE_JS,
      content: getNodeTriggerSnippet({
        identifier: trigger.identifier,
        to: toValue,
        payload: payloadValue,
        snippet: reservedValue,
      }),
    },
    {
      value: CURL,
      content: getCurlTriggerSnippet({
        identifier: trigger.identifier,
        to: toValue,
        payload: payloadValue,
        snippet: reservedValue,
      }),
    },
  ];

  return <Tabs defaultValue={NODE_JS} data-test-id="trigger-code-snippet" menuTabs={prismTabs} />;
}

export const getNodeTriggerSnippet = (props: CodeSnippetProps) => {
  return (
    <Prism mt={5} styles={prismStyles} data-test-id="trigger-code-snippet" language="javascript">
      {createNodeSnippet(props)}
    </Prism>
  );
};

export const getCurlTriggerSnippet = (props: CodeSnippetProps) => {
  return (
    <Prism mt={5} styles={prismStyles} language="bash" key="2" data-test-id="trigger-curl-snippet">
      {createCurlSnippet(props)}
    </Prism>
  );
};

export const getPayloadValue = (variables: INotificationTriggerVariable[]) => {
  const varsObj: Record<string, any> = {};
  variables
    .filter((variable) => variable?.type !== TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, variable.value || '<REPLACE_WITH_DATA>');
    });
  variables
    .filter((variable) => variable?.type === TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, [get(varsObj, variable.name, '<REPLACE_WITH_DATA>')]);
    });

  return varsObj;
};
export const getSubscriberValue = (
  variables: INotificationTriggerVariable[],
  getValue: (variable: INotificationTriggerVariable) => any
) => {
  const varsObj: Record<string, any> = {};
  variables.forEach((variable) => {
    set(varsObj, variable.name, getValue(variable));
  });

  return varsObj;
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
