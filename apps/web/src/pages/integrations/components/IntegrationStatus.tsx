import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { colors } from '@novu/design-system';

const StatusHolder = styled.div`
  width: fit-content;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  color: ${colors.success};

  &[data-disabled='true'] {
    color: ${colors.B40};
  }
`;

const StatusIcon = styled(FontAwesomeIcon)`
  font-size: 16px;
`;

const StatusName = styled.span`
  font-size: 14px;
`;

const STATUS_TO_ICON = {
  Active: 'bolt',
  Disabled: 'bolt',
};

export const IntegrationStatus = ({ active, className }: { active: boolean; className?: string }) => {
  const status = active ? 'Active' : 'Disabled';

  return (
    <StatusHolder className={className} data-disabled={status === 'Disabled'} data-test-id="integration-status-cell">
      <StatusIcon icon={STATUS_TO_ICON[status] as any} />
      <StatusName>{status}</StatusName>
    </StatusHolder>
  );
};
