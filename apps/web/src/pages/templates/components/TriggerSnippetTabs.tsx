import { Prism } from '@mantine/prism';
import { useMemo } from 'react';
import set from 'lodash.set';
import get from 'lodash.get';

import {
  INotificationTrigger,
  INotificationTriggerVariable,
  TemplateVariableTypeEnum,
} from '@novu/shared';

import { colors, Tabs } from '@novu/design-system';
import {
  CodeSnippetProps,
  createCurlSnippet,
  createNodeSnippet,
} from '../../../utils/codeSnippets';

const NODE_JS = 'Node.js';
const CURL = 'Curl';

export function TriggerSnippetTabs({ trigger }: { trigger: INotificationTrigger }) {
  const {
    subscriberVariables: triggerSubscriberVariables = [],
    reservedVariables: triggerSnippetVariables = [],
  } = trigger || {};

  const reservedValue = useMemo(() => {
    return triggerSnippetVariables.reduce((prev, variable) => {
      prev[variable.type] = getPayloadValue(variable.variables);
      return prev;
    }, {});
  }, [triggerSnippetVariables]);

  const prismTabs = useMemo(() => {
    return createTriggerSnippetTabs({
      identifier: trigger.identifier,
      subscriberVariables: triggerSubscriberVariables,
      triggerVariables: trigger.variables,
      reservedVariables: reservedValue,
    });
  }, [trigger.identifier, triggerSubscriberVariables, trigger.variables, reservedValue]);

  return (
    <Tabs defaultValue={NODE_JS} data-test-id="trigger-code-snippet" menuTabs={prismTabs} />
  );
}

// 🔧 Abstracted helper function for creating tabs
const createTriggerSnippetTabs = ({
  identifier,
  subscriberVariables,
  triggerVariables,
  reservedVariables,
}: {
  identifier: string;
  subscriberVariables: INotificationTriggerVariable[];
  triggerVariables: INotificationTriggerVariable[];
  reservedVariables: Record<string, unknown>;
}) => {
  const isPassingSubscriberId = subscriberVariables?.find((el) => el.name === 'subscriberId');

  const subs = isPassingSubscriberId
    ? [...subscriberVariables]
    : [{ name: 'subscriberId' }, ...subscriberVariables];

  const toValue = getSubscriberValue(subs, (variable) => variable.value || '<REPLACE_WITH_DATA>');
  const payloadValue = getPayloadValue(triggerVariables);

  return [
    {
      value: NODE_JS,
      content: getNodeTriggerSnippet({
        identifier,
        to: toValue,
        payload: payloadValue,
        snippet: reservedVariables,
      }),
    },
    {
      value: CURL,
      content: getCurlTriggerSnippet({
        identifier,
        to: toValue,
        payload: payloadValue,
        snippet: reservedVariables,
      }),
    },
  ];
};

// ✅ Snippet rendering logic
const getNodeTriggerSnippet = (props: CodeSnippetProps) => {
  return (
    <Prism
      mt={5}
      styles={prismStyles}
      data-test-id="trigger-code-snippet"
      language="javascript"
    >
      {createNodeSnippet(props)}
    </Prism>
  );
};

const getCurlTriggerSnippet = (props: CodeSnippetProps) => {
  return (
    <Prism
      mt={5}
      styles={prismStyles}
      language="bash"
      key="2"
      data-test-id="trigger-curl-snippet"
    >
      {createCurlSnippet(props)}
    </Prism>
  );
};

// ✅ Payload variable processing
const getPayloadValue = (variables: INotificationTriggerVariable[]) => {
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

// ✅ Subscriber variable processor
const getSubscriberValue = (
  variables: INotificationTriggerVariable[],
  getValue: (variable: INotificationTriggerVariable) => any
) => {
  const varsObj: Record<string, any> = {};
  variables.forEach((variable) => {
    set(varsObj, variable.name, getValue(variable));
  });

  return varsObj;
};

// ✅ Prism style configuration
const prismStyles = (theme) => ({
  scrollArea: {
    border: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]
    }`,
    borderRadius: '7px',
  },
  code: {
    fontWeight: 400,
    color: `${colors.B60} !important`,
    backgroundColor: 'transparent !important',
  },
});
