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

const buildTrigger = (identifier, subscriber, payload): INotificationTrigger => {
  const subscriberVariables = [{ name: 'subscriberId', value: subscriber._id }];

  if (subscriber.email) {
    subscriberVariables.push({
      name: 'email',
      value: subscriber.email,
    });
  }

  if (subscriber.phone) {
    subscriberVariables.push({
      name: 'phone',
      value: subscriber.phone,
    });
  }

  return {
    type: TriggerTypeEnum.EVENT,
    identifier,
    variables: payload ? Object.entries(payload).map(([name, value]) => ({ name, value })) : [],
    subscriberVariables,
  };
};

export const ExecutionDetailTrigger = ({ step, subscriber }) => {
  const { identifier, payload } = step || {};
  const trigger = buildTrigger(identifier, subscriber, payload);

  return (
    <>
      <TriggerTitle>Trigger information</TriggerTitle>
      <TriggerSnippetTabs trigger={trigger} />
    </>
  );
};
