import { Prism } from '@mantine/prism';
import { useMemo } from 'react';
import * as set from 'lodash.set';
import * as get from 'lodash.get';

import { INotificationTrigger, INotificationTriggerVariable, TemplateVariableTypeEnum } from '@novu/shared';

import { colors, Tabs } from '@novu/design-system';
import { createCurlSnippet, createNodeSnippet } from '../../../utils/codeSnippets';

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
    return triggerSnippetVariables.reduce((acc, variable) => {
      acc[variable.type] = getPayloadValue(variable.variables);

      return acc;
    }, {});
  }, [triggerSnippetVariables]);

  const prismTabs = [
    {
      value: NODE_JS,
      content: getNodeTriggerSnippet(trigger.identifier, toValue, payloadValue, undefined, reservedValue),
    },
    {
      value: CURL,
      content: getCurlTriggerSnippet(trigger.identifier, toValue, payloadValue, undefined, reservedValue),
    },
  ];

  return <Tabs defaultValue={NODE_JS} data-test-id="trigger-code-snippet" menuTabs={prismTabs} />;
}

export const getNodeTriggerSnippet = (
  identifier: string,
  to: Record<string, unknown>,
  payload: Record<string, unknown>,
  overrides?: Record<string, unknown>,
  snippet?: Record<string, unknown>,
  apiKey = '<API_KEY>'
) => {
  const triggerCodeSnippet = createNodeSnippet(identifier, to, payload, overrides, snippet, apiKey);

  return (
    <Prism mt={5} styles={prismStyles} data-test-id="trigger-code-snippet" language="javascript">
      {triggerCodeSnippet}
    </Prism>
  );
};

export const getCurlTriggerSnippet = (
  identifier: string,
  to: Record<string, any>,
  payload: Record<string, any>,
  overrides?: Record<string, any>,
  snippet?: Record<string, unknown>,
  apiKey = '<REPLACE_WITH_API_KEY>'
) => {
  const curlSnippet = createCurlSnippet(identifier, to, payload, overrides, snippet, apiKey);

  return (
    <Prism mt={5} styles={prismStyles} language="bash" key="2" data-test-id="trigger-curl-snippet">
      {curlSnippet}
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
