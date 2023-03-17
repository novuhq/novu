import { Dispatch, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { Grid } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';

import { quickStartChannels } from '../consts';
import { When } from '../../../components/utils/When';
import { ActiveLabel } from '../../../design-system/icons/general/ActiveLabel';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useActiveIntegrations, useIntegrationLimit } from '../../../hooks';
import { Button, colors } from '../../../design-system';

export function ChannelsConfiguration({ setClickedChannel }: { setClickedChannel: Dispatch<any> }) {
  const segment = useSegment();
  const navigate = useNavigate();
  const { integrations } = useActiveIntegrations();
  const { isLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);

  useEffect(() => {
    // segment.track(OnBoardingAnalyticsEnum.QUICK_START_VISIT);
  }, []);

  return (
    <Grid style={{ maxWidth: '850px' }}>
      {quickStartChannels.map((channel, index) => {
        const Icon = channel.Icon;

        let isIntegrationActive = !!integrations?.some((integration) => integration.channel === channel.type);
        if (channel.type === ChannelTypeEnum.EMAIL) {
          isIntegrationActive = isIntegrationActive || !isLimitReached;
        }

        return (
          <CardCol span={5} key={index}>
            <Container>
              <IconContainer>
                <Icon style={{ width: '28px', height: '32px' }} />
              </IconContainer>
              <ChannelCard>
                <TitleRow>
                  {channel.title}
                  <When truthy={isIntegrationActive}>
                    <ActiveLabel style={{ height: '20px', marginLeft: '16px' }} />
                  </When>
                </TitleRow>
                <Description>{channel.description}</Description>
                <StyledButton
                  variant={'outline'}
                  onClick={() =>
                    channel.clickHandler({
                      navigate,
                      setClickedChannel,
                      channelType: channel.type,
                    })
                  }
                >
                  {isIntegrationActive ? 'Change Provider' : `Configure ${channel.displayName}`}
                </StyledButton>
              </ChannelCard>
            </Container>
          </CardCol>
        );
      })}
    </Grid>
  );
}

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 32px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B80)};
  margin-right: 20px;
`;

const ChannelCard = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;

  max-width: 280px;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;

  font-size: 20px;
  line-height: 32px;
  margin-bottom: 8px;
`;

const Description = styled.div`
  flex: auto;

  font-size: 16px;
  line-height: 20px;
  margin-bottom: 20px;
  color: ${colors.B60};
`;

const StyledButton = styled(Button)`
  width: fit-content;
`;

const Container = styled.div`
  display: flex;
  justify-content: flex-start;
  height: 100%;
`;

const CardCol = styled(Grid.Col)`
  margin-bottom: 40px;
  width: 300px;

  @media screen and (min-width: 1369px) {
    width: initial;
  }
`;
