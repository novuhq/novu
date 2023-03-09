import React from 'react';
import { Grid, Timeline } from '@mantine/core';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

import { colors } from '../../../../design-system';
import { localNavigate } from '../route/store';
import { getStartedSteps } from '../../consts';

export function BodyLayout({ children }: { children: React.ReactNode }) {
  return (
    <StyledBody>
      <Grid>
        <Grid.Col span={4}>
          <BodyNavigation />
        </Grid.Col>
        <Grid.Col span={8}>{children}</Grid.Col>
      </Grid>
    </StyledBody>
  );
}

const StyledBody = styled.div`
  display: block;
  flex: auto;
`;

function BodyNavigation() {
  const navigate = useNavigate();

  const stepNum = localNavigate().length();

  function handleClick(step: string) {
    navigate(getStartedSteps[step]);
  }

  return (
    <TimelineWrapper>
      <Timeline
        bulletSize={40}
        lineWidth={2}
        styles={{
          itemBullet: {
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
  padding: 75px;

  .mantine-Timeline-itemBullet {
    background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : '#EDF0F2')};
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  }
`;

const TimelineText = styled.div<{ active: boolean }>`
  font-size: 20px;
  font-weight: 700;
  line-height: 32px;

  min-height: 80px;

  margin-left: 52px;
  padding: 24px;

  display: flex;
  align-items: center;
  border-radius: 8px;

  cursor: pointer;

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
  min-height: 140px;
`;
