import { Link, StepDescription } from './shared';
import { OnboardingUseCase } from './types';

export const MultiChannelUseCaseConst: OnboardingUseCase = {
  title: 'Multi-channel notifications',
  description:
    'Notifies subscribers using a wide range of channels: In-App, Email, Chat, Push, and SMS.\n' +
    '\n' +
    'Configure as many providers as you like to Customize notification experience.',
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
            <StepDescription>Novu has prepared workflow templates.</StepDescription>
            <Link text={'  Customize  '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription> a Multi-Channel template or start with a blank workflow.</StepDescription>
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
              Test the trigger as if you sent it from your API. Add a subscriber by sending data to the trigger method.
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
