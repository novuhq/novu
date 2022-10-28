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

const buildTrigger = (identifier, subscriberId, payload): INotificationTrigger => ({
  type: TriggerTypeEnum.EVENT,
  identifier,
  variables: payload ? Object.entries(payload).map(([name, value]) => ({ name, value })) : [],
  subscriberVariables: [{ name: 'subscriberId', value: subscriberId }],
});

export const ExecutionDetailTrigger = ({ step }) => {
  const { identifier, payload, _subscriberId } = step || {};
  const trigger = buildTrigger(identifier, _subscriberId, payload);

  return (
    <>
      <TriggerTitle>Trigger information</TriggerTitle>
      <TriggerSnippetTabs trigger={trigger} />
    </>
  );
};
