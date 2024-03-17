import { ROUTES } from '@novu/shared-web';

import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingWorkflowRouteEnum, OnboardingUseCase } from './types';
import { GetStartedAnimation } from '../components/GetStartedAnimation';
import { OpenWorkflowButton } from '../components/OpenWorkflowButton';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-delay';

export const DelayUseCaseConst: OnboardingUseCase = {
  useCaseLink: 'https://docs.novu.co/workflows/delay-action?utm_campaign=inapp-usecase-delay',
  type: OnboardingUseCasesTabsEnum.DELAY,
  title: 'Delay step execution',
  description: 'Introduces a specified time delay between workflow steps, ensuring a well-paced progression of events.',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <GetStartedLink
              children={' Integration store'}
              href={ROUTES.INTEGRATIONS_CREATE}
              target="_blank"
              rel="noopener noreferrer"
            />
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
            <StepText>Novu pre-built workflow with a delay node. </StepText>
            <OpenWorkflowButton blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}>Customize</OpenWorkflowButton>
            <StepText> the workflow or create a new one on the Workflows page.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Set-up delay preferences',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Novu has predefined a time interval of 5 minutes. </StepText>
            <OpenWorkflowButton
              blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}
              node={OnboardingWorkflowRouteEnum.DELAY}
            >
              Customize delay
            </OpenWorkflowButton>
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
            <OpenWorkflowButton
              blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}
              node={OnboardingWorkflowRouteEnum.TEST_WORKFLOW}
            >
              Test the trigger
            </OpenWorkflowButton>
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
            <GetStartedLink
              children={' activity feed '}
              href={ROUTES.ACTIVITIES}
              target="_blank"
              rel="noopener noreferrer"
            />
            <StepText>
              to monitor notifications activity and see potential issues with a specific provider or channel.
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => <GetStartedAnimation useCase={OnboardingUseCasesTabsEnum.DELAY} />,
};
