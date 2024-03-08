import styled from '@emotion/styled';
import { Flex } from '@mantine/core';
import { Bolt, Button, colors, Text } from '@novu/design-system';
import { useState } from 'react';
import { TimerControl } from '../../../components/TimerControl';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { StepButton, StepDescription, StepText, StyledLink } from './shared';
import { OnboardingUseCase } from './types';

const StyledBolt = styled(Bolt)`
  color: ${colors.gradientMiddle};
`;

export const DigestPlaygroundView: OnboardingUseCase = {
  title: 'Digest playground',
  steps: [
    {
      title: 'Set digest interval',
      Description: function () {
        const [time, setTime] = useState<number>(10);

        return (
          <StepDescription>
            <StepText>Specify the interval during which the digest will collect notifications.</StepText>
            <TimerControl unitLabel="sec" mt="0.5rem" value={time} min={10} setValue={setTime} />
          </StepDescription>
        );
      },
    },

    {
      title: 'Run trigger multiple times',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Click the button multiple times to generate a few notifications.</StepText>
            <StepButton variant="outline" mt="0.5rem">
              Run workflow trigger
            </StepButton>
          </StepDescription>
        );
      },
    },
    {
      title: 'Check your email once the time is up',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Find a message from Novu in your email once the time is up.</StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => <>Digest Playground</>,
  type: OnboardingUseCasesTabsEnum.DIGEST,
  useCaseLink: '',
  BottomSection: function () {
    return (
      <StyledLink href="#">
        <Flex gap={'0.5rem'}>
          <StyledBolt />
          <Text gradient>Open this workflow</Text>
        </Flex>
      </StyledLink>
    );
  },
};
