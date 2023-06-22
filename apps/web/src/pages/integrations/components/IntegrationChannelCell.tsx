import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { colors, IExtendedCellProps, withCellLoading } from '../../../design-system';
import { CHANNEL_TYPE_TO_ICON } from '../constants';
import type { ITableIntegration } from '../types';

const ChannelCellHolder = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
`;

const IconStyled = styled(FontAwesomeIcon)`
  font-size: 16px;
  color: ${colors.B40};
`;

const Text = styled.span`
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  font-size: 14px;
`;

const IntegrationChannel = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  return (
    <ChannelCellHolder>
      <IconStyled icon={CHANNEL_TYPE_TO_ICON[original.channelType] as any} />
      <Text>{original.channel}</Text>
    </ChannelCellHolder>
  );
};

export const IntegrationChannelCell = withCellLoading(IntegrationChannel);
