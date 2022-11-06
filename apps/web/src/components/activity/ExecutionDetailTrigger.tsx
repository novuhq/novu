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

const mapSubscriberVariables = (subscriberVariables) => {
  const mappedVariables = subscriberVariables
    ? Object.keys(subscriberVariables).map((key) => {
        return {
          name: key,
          value: subscriberVariables[key],
        };
      })
    : [];

  return mappedVariables;
};

const buildTrigger = (identifier, subscriberVariables, payload): INotificationTrigger => {
  return {
    type: TriggerTypeEnum.EVENT,
    identifier,
    variables: payload ? Object.entries(payload).map(([name, value]) => ({ name, value })) : [],
    subscriberVariables: mapSubscriberVariables(subscriberVariables),
  };
};

export const ExecutionDetailTrigger = ({ identifier, step, subscriberVariables }) => {
  const { payload } = step || {};
  const trigger = buildTrigger(identifier, subscriberVariables, payload);

  return (
    <>
      <TriggerTitle>Trigger information</TriggerTitle>
      <TriggerSnippetTabs trigger={trigger} />
    </>
  );
};
