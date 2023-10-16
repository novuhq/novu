import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ChannelTypeEnum } from '@novu/shared';

import { colors } from '@novu/design-system';
import { CHANNEL_TYPE_TO_ICON_NAME } from '../constants';

const IconSkeleton = styled(Skeleton)`
  width: 16px;
  height: 16px;
`;

const TextSkeleton = styled(Skeleton)`
  width: 80px;
  height: 16px;
`;

const ChannelCellHolder = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
`;

const IconStyled = styled(FontAwesomeIcon)`
  font-size: 16px;
  color: ${colors.B40};
`;

const Text = styled.span<{ sameColor: boolean }>`
  color: ${({ theme, sameColor }) => {
    if (sameColor) {
      return colors.B40;
    }

    return theme.colorScheme === 'dark' ? colors.white : colors.B40;
  }};
  font-size: 14px;
`;

export const IntegrationChannel = ({
  name,
  type,
  testId,
  sameColor = false,
  isLoading,
}: {
  name: string;
  type?: ChannelTypeEnum;
  testId?: string;
  sameColor?: boolean;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <ChannelCellHolder data-test-id={testId}>
        <IconSkeleton />
        <TextSkeleton />
      </ChannelCellHolder>
    );
  }

  return (
    <ChannelCellHolder data-test-id={testId}>
      <IconStyled icon={CHANNEL_TYPE_TO_ICON_NAME[type ?? ''] as any} />
      <Text sameColor={sameColor}>{name}</Text>
    </ChannelCellHolder>
  );
};
