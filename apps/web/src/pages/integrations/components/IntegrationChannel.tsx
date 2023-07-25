import styled from '@emotion/styled';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ChannelTypeEnum } from '@novu/shared';

import { colors } from '../../../design-system';
import { CHANNEL_TYPE_TO_ICON_NAME } from '../constants';

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

export const IntegrationChannel = ({
  name,
  type,
  testId,
}: {
  name: string;
  type: ChannelTypeEnum;
  testId?: string;
}) => {
  return (
    <ChannelCellHolder data-test-id={testId}>
      <IconStyled icon={CHANNEL_TYPE_TO_ICON_NAME[type] as any} />
      <Text>{name}</Text>
    </ChannelCellHolder>
  );
};
