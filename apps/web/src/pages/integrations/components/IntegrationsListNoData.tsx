import styled from '@emotion/styled';
import { ChannelTypeEnum } from '@novu/shared';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { CardTile, colors } from '@novu/design-system';
import { CHANNEL_TYPE_TO_ICON_NAME } from '../constants';
import { CHANNEL_TYPE_TO_STRING } from '../../../utils/channels';

const NoDataHolder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 500px;
`;

const NoDataSubHeading = styled.p`
  margin: 0;
  font-size: 20px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B80)};
`;

const CardsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin: 30px 20px;

  @media screen and (min-width: 1281px) {
    margin: 50px 40px;
  }
`;

export const CHANNELS_ORDER = [
  ChannelTypeEnum.IN_APP,
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.CHAT,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.SMS,
];

interface IntegrationsListNoDataProps {
  onChannelClick: (channel: ChannelTypeEnum) => void;
}

export const IntegrationsListNoData = ({ onChannelClick }: IntegrationsListNoDataProps) => {
  return (
    <NoDataHolder data-test-id="no-integrations-placeholder">
      <NoDataSubHeading>Choose a channel you want to start sending notifications</NoDataSubHeading>
      <CardsContainer>
        {CHANNELS_ORDER.map((channel) => (
          <CardTile
            key={channel}
            data-test-id={`integration-channel-card-${channel}`}
            onClick={() => {
              onChannelClick(channel);
            }}
          >
            <FontAwesomeIcon icon={CHANNEL_TYPE_TO_ICON_NAME[channel] as any} />
            <span>{CHANNEL_TYPE_TO_STRING[channel]}</span>
          </CardTile>
        ))}
      </CardsContainer>
    </NoDataHolder>
  );
};
