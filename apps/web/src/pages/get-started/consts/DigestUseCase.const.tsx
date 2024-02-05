import { Link, StepDescription } from './shared';
import { OnboardingUseCase } from './types';

export const DigestUseCaseConst: OnboardingUseCase = {
  title: 'Digest multiple events',
  description:
    'Aggregates multiple events into a single, concise message, preventing user overload with excessive notifications.',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <span>
            <StepDescription>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepDescription>
            <Link text={' Integration store'} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>.</StepDescription>
          </span>
        );
      },
    },

    {
      title: 'Build a workflow',
      Description: function () {
        return (
          <span>
            <StepDescription>Novu pre-built workflow with a digest node.</StepDescription>
            <Link text={' Customize '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>the workflow or create a new one on the Workflows page.</StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Set-up a delay preferences',
      Description: function () {
        return (
          <span>
            <StepDescription>Novu pre-defined preferences for the digest node.</StepDescription>
            <Link text={' Customise digest node'} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>.</StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Connect trigger and run test',
      Description: function () {
        return (
          <span>
            <Link text={'Test the trigger '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>
              as if you sent it from your API. Add a subscriber by sending data to the trigger method. Click multiple
              times to see how the digest node butch messages.
            </StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Track activity feed',
      Description: function () {
        return (
          <span>
            <StepDescription>Discover</StepDescription>
            <Link text={' activity feed '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>
              to monitor notifications activity and see potential issues with a specific provider or channel.
            </StepDescription>
          </span>
        );
      },
    },
  ],
  Demo: () => {
    return <h1>GIF</h1>;
  },
};
