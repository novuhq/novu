import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { colors, IExtendedCellProps, Text, withCellLoading } from '../../../design-system';
import { CHANNEL_TYPE_TO_ICON_NAME } from '../constants';
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

const IntegrationChannel = ({ row: { original } }: IExtendedCellProps<ITableIntegration>) => {
  return (
    <ChannelCellHolder data-test-id="integration-channel-cell">
      <IconStyled icon={CHANNEL_TYPE_TO_ICON_NAME[original.channelType] as any} />
      <Text>{original.channel}</Text>
    </ChannelCellHolder>
  );
};

export const IntegrationChannelCell = withCellLoading(IntegrationChannel, {
  loadingTestId: 'integration-channel-cell-loading',
});
