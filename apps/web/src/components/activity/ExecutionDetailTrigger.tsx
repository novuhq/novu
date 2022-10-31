import { INotificationTrigger, TriggerTypeEnum } from '@novu/shared';
import styled from 'styled-components';

import { colors, Tabs, Text } from '../../design-system';
import { TriggerSnippetTabs } from '../../components/templates/TriggerSnippetTabs';

const TriggerTitle = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 20px;
`;

const buildTrigger = (identifier, subscriberVariables, payload): INotificationTrigger => {
  subscriberVariables = JSON.parse(subscriberVariables || '{}');

  return {
    type: TriggerTypeEnum.EVENT,
    identifier,
    variables: payload ? Object.entries(payload).map(([name, value]) => ({ name, value })) : [],
    subscriberVariables: Object.keys(subscriberVariables).map((key) => {
      return {
        name: key,
        value: subscriberVariables[key],
      };
    }),
  };
};

export const ExecutionDetailTrigger = ({ step, subscriberVariables }) => {
  const { identifier, payload } = step || {};
  const trigger = buildTrigger(identifier, subscriberVariables, payload);

  return (
    <>
      <TriggerTitle>Trigger information</TriggerTitle>
      <TriggerSnippetTabs trigger={trigger} />
    </>
  );
};
