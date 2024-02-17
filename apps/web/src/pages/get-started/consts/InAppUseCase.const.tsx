import { DemoLayout, Link, StepDescription, StepText } from './shared';
import { OnboardingNodeEnum, OnboardingUseCase } from './types';
import { OpenWorkflowButton } from '../components/OpenWorkflowButton';
import { ROUTES } from '../../../constants/routes.enum';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-in-app';

export const InAppUseCaseConst: OnboardingUseCase = {
  title: 'In-app notifications center',
  description:
    "Utilize Novu's pre-built customizable in-app component. " +
    'Or opt for the headless library to create your own in-app notification center.',
  steps: [
    {
      title: 'Configure In-App provider',
      Description: function () {
        return (
          <StepDescription>
            <Link children={'Create In-app provider'} route={ROUTES.INTEGRATIONS_CREATE} />
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
            <OpenWorkflowButton children={' Customize '} blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER} />
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
            <OpenWorkflowButton
              children={'Test the trigger'}
              blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}
              node={OnboardingNodeEnum.TEST_WORKFLOW}
            />
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
            <Link children={' activity feed '} route={ROUTES.ACTIVITIES} />
            <StepText>
              to monitor notifications activity and see potential issues with a specific provider or channel.
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => {
    return (
      <DemoLayout>
        <h1>Placeholder</h1>
      </DemoLayout>
    );
  },
};
