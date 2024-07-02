import styled from '@emotion/styled';

import { Text } from '@novu/design-system';
import { getCurlTriggerSnippet } from '../../pages/templates/components/TriggerSnippetTabs';

const TriggerTitle = styled(Text)`
  font-size: 14px;
  font-weight: 700;
  line-height: 17px;
  padding-bottom: 20px;
`;

export const ExecutionDetailTrigger = ({ identifier, step, subscriberVariables }) => {
  const { payload, overrides, tenant, actorId } = step || {};

  const curlSnippet = getCurlTriggerSnippet({
    identifier,
    to: subscriberVariables,
    payload,
    overrides,
    snippet: {
      ...(tenant && { tenant }),
      ...(actorId && { actor: { subscriberId: actorId } }),
    },
  });

  return (
    <>
      <TriggerTitle>Trigger information</TriggerTitle>
      {curlSnippet}
    </>
  );
};
