import styled from '@emotion/styled';
import { Flex } from '@mantine/core';
import { Bolt, Button, colors, Text } from '@novu/design-system';
import { useEffect, useState } from 'react';
import { TimerControl } from '../../../components/TimerControl';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { StepDescription, StepDescriptionAction, StepText, StyledLink } from './shared';
import { OnboardingUseCase } from './types';
import { useDigestDemoFlowContext } from '../../../components/quick-start/digest-demo-flow/DigestDemoFlowProvider';
import { GetStartedAnimationContainer } from '../components/GetStartedAnimationContainer';

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

        const { isReadOnly, triggerCount, isRunningDigest, digestInterval, updateDigestInterval } =
          useDigestDemoFlowContext();

        useEffect(() => {
          updateDigestInterval(time);
        }, [time]);

        return (
          <StepDescription>
            <StepText>Specify the interval during which the digest will collect notifications.</StepText>
            <TimerControl unitLabel="sec" mt="0.5rem" value={time} min={10} max={30} setValue={setTime} />
          </StepDescription>
        );
      },
    },

    {
      title: 'Run trigger multiple times',
      Description: function () {
        const { runTrigger } = useDigestDemoFlowContext();

        return (
          <StepDescriptionAction>
            <StepText>Click the button multiple times to generate a few notifications.</StepText>
            <Button onClick={runTrigger} variant="outline">
              Run workflow trigger
            </Button>
          </StepDescriptionAction>
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
  Demo: ({ children }: { children?: React.ReactNode }) => (
    <GetStartedAnimationContainer assetDark={'Dark Playground'} assetLight={'Light Playground'}>
      {children}
    </GetStartedAnimationContainer>
  ),
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
