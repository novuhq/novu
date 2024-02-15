import styled from '@emotion/styled';
import { Flex } from '@mantine/core';
import { Bolt, Button, colors, Text } from '@novu/design-system';
import { ROUTES } from '@novu/shared-web';
import { useState } from 'react';
import { TimerControl } from '../../../components/TimerControl';
import { CreateWorkflowButton } from '../components/CreateWorkflowButton';
import { GetStartedAnimationContainer } from '../components/GetStartedAnimationContainer';
import { Link, StepDescription, StepText, StyledLink } from './shared';
import { OnboardingUseCase } from './types';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-digest';

export const DigestUseCaseConst: OnboardingUseCase = {
  title: 'Digest multiple events',
  description:
    'Aggregates multiple events into a single, concise message, preventing user overload with excessive notifications.',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <Link href={ROUTES.INTEGRATIONS}> Integration store</Link>
            <StepText>.</StepText>
          </StepDescription>
        );
      },
    },

    {
      title: 'Build a workflow',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Novu pre-built workflow with a digest node. </StepText>
            <CreateWorkflowButton blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}>Customize</CreateWorkflowButton>
            <StepText> the workflow or create a new one on the Workflows page.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Set-up a delay preferences',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Novu pre-defined preferences for the digest node.</StepText>
            <Link href={'https://mantine.dev/core/timeline/'}> Customize digest node</Link>
            <StepText>.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Connect trigger and run test',
      Description: function () {
        return (
          <StepDescription>
            <Link href={'https://mantine.dev/core/timeline/'}>Test the trigger </Link>
            <StepText>
              as if you sent it from your API. Add a subscriber by sending data to the trigger method. Click multiple
              times to see how the digest node butch messages.
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Track activity feed',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Discover</StepText>
            <Link href={ROUTES.ACTIVITIES}> activity feed </Link>
            <StepText>
              to monitor notifications activity and see potential issues with a specific provider or channel.
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => <GetStartedAnimationContainer assetDark={'Dark Placeholder'} assetLight={'Light Placeholder'} />,
  BottomSection: function () {
    return (
      <StepDescription>
        <StepText>Not ready to configure Digest? </StepText>
        <br />
        <Link href={ROUTES.ACTIVITIES}>Open digest playground</Link>
        <StepText> for a quick test.</StepText>
      </StepDescription>
    );
  },
};

const StyledBolt = styled(Bolt)`
  color: ${colors.gradientMiddle};
`;

export const DigestPlaygroundUseCase: OnboardingUseCase = {
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
            <Button variant="outline" mt="0.5rem">
              Run workflow trigger
            </Button>
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
  Demo: () => <GetStartedAnimationContainer assetDark={'Dark Playground'} assetLight={'Light Playground'} />,
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
