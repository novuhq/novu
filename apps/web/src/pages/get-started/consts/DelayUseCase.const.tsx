import { Link, StepDescription } from './shared';
import { OnboardingUseCase } from './types';

export const DelayUseCaseConst: OnboardingUseCase = {
  title: 'Delay step execution',
  description: 'Introduces a specified time delay between workflow steps, ensuring a well-paced progression of events.',
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
            <StepDescription>Novu has predefined a time interval of 5 minutes.</StepDescription>
            <Link text={' Customize delay'} href={'https://mantine.dev/core/timeline/'} />
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
              as if you sent it from your API. Add a subscriber by sending data to the trigger method.
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
