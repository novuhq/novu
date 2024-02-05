import { Link, StepDescription, StepText } from './shared';
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
          <StepDescription>
            <Link children={'Create In-app provider'} href={'https://mantine.dev/core/timeline/'} />
            <StepText>
              {' instance, and select a framework to set up credentials in the Novu’s Integration store.'}
            </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Build a workflow',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Novu pre-built a workflow for testing.</StepText>
            <Link children={' Customize '} href={'https://mantine.dev/core/timeline/'} />
            <StepText>it or create a new one on the Workflows page. </StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Connect trigger and run test',
      Description: function () {
        return (
          <StepDescription>
            <Link children={'Test the trigger'} href={'https://mantine.dev/core/timeline/'} />
            <StepText>
              {' as if you sent it from your API. Add a subscriber by sending data to the trigger method.'}
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
            <Link children={' activity feed '} href={'https://mantine.dev/core/timeline/'} />
            <StepText>
              to monitor notifications activity and see potential issues with a specific provider or channel.
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => {
    return <h1>GIF</h1>;
  },
};
