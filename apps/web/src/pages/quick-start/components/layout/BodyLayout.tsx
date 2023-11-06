import React from 'react';
import { Grid, Timeline } from '@mantine/core';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

import { colors } from '@novu/design-system';
import { getStartedSteps, OnBoardingAnalyticsEnum } from '../../consts';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../../constants/routes.enum';

const BULLET_TOP_MARGIN = 20;

export function BodyLayout({ children }: { children: React.ReactNode }) {
  return (
    <StyledBody>
      <Grid columns={24} m={0}>
        <Grid.Col span={7}>
          <BodyNavigation />
        </Grid.Col>
        <Grid.Col span={17}>{children}</Grid.Col>
      </Grid>
    </StyledBody>
  );
}

const StyledBody = styled.div`
  height: calc(100vh - 180px);
  padding-top: 25px;
  padding-bottom: 25px;
  overflow-y: auto;
`;

function BodyNavigation() {
  const navigate = useNavigate();
  const segment = useSegment();

  const stepNum = location.pathname === ROUTES.GET_STARTED ? 1 : 2;

  function handleClick(step: 'first' | 'second') {
    const eventAction =
      step === 'first'
        ? OnBoardingAnalyticsEnum.NAVIGATION_CONFIGURE_PROVIDER_CLICK
        : OnBoardingAnalyticsEnum.NAVIGATION_BUILD_WORKFLOW_CLICK;
    segment.track(eventAction);

    navigate(getStartedSteps[step]);
  }

  return (
    <TimelineWrapper>
      <Timeline
        bulletSize={40}
        lineWidth={2}
        styles={{
          itemBullet: {
            marginTop: `${BULLET_TOP_MARGIN}px`,
            ['&[data-active][data-with-child]']: {
              color: 'inherit',
            },
          },
        }}
      >
        <StyledItem bullet={'1'} lineVariant={'dashed'}>
          <TimelineText active={stepNum === 1} onClick={() => handleClick('first')}>
            Configure a provider
          </TimelineText>
        </StyledItem>

        <StyledItem bullet={'2'}>
          <TimelineText active={stepNum === 2} onClick={() => handleClick('second')}>
            Build a notification
            <br /> workflow
          </TimelineText>
        </StyledItem>
      </Timeline>
    </TimelineWrapper>
  );
}

const TimelineWrapper = styled.div`
  width: 100%;
  padding: 0 0 0 40px;

  .mantine-Timeline-itemBullet {
    width: 34px;
    height: 34px;
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : '#EDF0F2')};
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  }

  @media screen and (min-width: 1369px) {
    .mantine-Timeline-itemBullet {
      width: 40px;
      height: 40px;
    }
  }
`;

const TimelineText = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  max-width: 320px;
  min-height: 80px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  padding: 12px;
  transition: margin-left 0.3s ease, padding 0.3s ease;
  border-radius: 8px;
  cursor: pointer;

  @media screen and (min-width: 1369px) {
    margin-left: 12px;
    padding: 24px;
    font-size: 20px;
    line-height: 32px;
  }

  ${({ active, theme }) => {
    return (
      (!active &&
        `
        box-shadow: transparent;
        background: transparent;
        color: ${theme.colorScheme === 'dark' ? colors.B40 : colors.B60};   

      `) ||
      (active &&
        `
      box-shadow: ${
        theme.colorScheme === 'dark' ? '0px 5px 20px rgba(0, 0, 0, 0.2)' : '0 5px 15px rgba(122, 133, 153, 0.25)'
      };         
      background: ${theme.colorScheme === 'dark' ? colors.B20 : '#EDF0F2'};   
      
      `)
    );
  }};
`;

const StyledItem = styled(Timeline.Item)`
  min-height: 100px;
  min-width: 170px;

  &:before {
    left: -5px;
    top: ${BULLET_TOP_MARGIN}px;
    bottom: ${({ theme }) => `calc((${theme.spacing.xl}px + ${BULLET_TOP_MARGIN}px) * -1)`};
  }

  @media screen and (min-width: 1369px) {
    min-height: 140px;

    &:before {
      left: -2px;
    }
  }
`;
