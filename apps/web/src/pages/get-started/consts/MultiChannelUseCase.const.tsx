import { Link, StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';
import { CreateWorkflowButton } from '../components/CreateWorkflowButton';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-multi-channel';

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
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <Link children={' Integration store'} href={'https://mantine.dev/core/timeline/'} />
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
            <StepText>Novu has prepared workflow templates.</StepText>
            <CreateWorkflowButton children={' Customize '} blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER} />
            <StepText> a Multi-Channel template or start with a blank workflow.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Connect trigger and run test',
      Description: function () {
        return (
          <StepDescription>
            <Link children={'Test the trigger '} href={'https://mantine.dev/core/timeline/'} />
            <StepText>
              Test the trigger as if you sent it from your API. Add a subscriber by sending data to the trigger method.
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
