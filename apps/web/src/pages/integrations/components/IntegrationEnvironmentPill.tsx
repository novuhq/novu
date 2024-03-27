import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { colors } from '@novu/design-system';

const SkeletonPill = styled(Skeleton)`
  width: 120px;
  height: 28px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
  border-radius: 16px;
`;

const EnvironmentPillHolder = styled.div`
  width: fit-content;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B85)};
  border-radius: 16px;
  padding: 6px 8px;
`;

const EnvironmentName = styled.span`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B80 : colors.B40)};
  font-size: 14px;
`;

const EnvironmentIcon = styled(FontAwesomeIcon)`
  font-size: 16px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B60 : colors.B40)};
`;

export const IntegrationEnvironmentPill = ({
  name,
  testId,
  isLoading,
}: {
  name: string;
  testId?: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return <SkeletonPill />;
  }

  return (
    <EnvironmentPillHolder data-test-id={testId}>
      <EnvironmentIcon icon={name.toLowerCase() === 'production' ? 'rocket' : 'tools'} />
      <EnvironmentName>{name}</EnvironmentName>
    </EnvironmentPillHolder>
  );
};
