import { Link, StepDescription } from './shared';
import { OnboardingUseCase } from './types';

export const InAppUseCaseConst: OnboardingUseCase = {
  title: 'In-app notifications center',
  description:
    'Utilize Novu’s pre-built customizable in-app component. ' +
    'Or opt for the headless library to create your own in-app notification center.',
  steps: [
    {
      title: 'Configure In-App provider',
      Description: function () {
        return (
          <span>
            <Link text={'Create In-app provider'} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>
              {' instance, and select a framework to set up credentials in the Novu’s Integration store.'}
            </StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Build a workflow',
      Description: function () {
        return (
          <span>
            <StepDescription>Novu pre-built a workflow for testing.</StepDescription>
            <Link text={' Customize '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>it or create a new one on the Workflows page. </StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Connect trigger and run test',
      Description: function () {
        return (
          <span>
            <Link text={'Test the trigger'} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>
              {' as if you sent it from your API. Add a subscriber by sending data to the trigger method.'}
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
