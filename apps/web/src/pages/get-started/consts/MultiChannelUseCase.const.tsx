import { ROUTES } from '@novu/shared-web';

import { GetStartedAnimation } from '../components/GetStartedAnimation';
import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingWorkflowRouteEnum, OnboardingUseCase } from './types';
import { OpenWorkflowButton } from '../components/OpenWorkflowButton';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-multi-channel';

export const MultiChannelUseCaseConst: OnboardingUseCase = {
  title: 'Multi-channel notifications',
  type: OnboardingUseCasesTabsEnum.MULTI_CHANNEL,
  description:
    'Notifies subscribers using a wide range of channels: In-App, Email, Chat, Push, and SMS.\n' +
    '\n' +
    'Configure as many providers as you like to Customize notification experience.',
  useCaseLink: 'https://docs.novu.co/channels-and-providers/introduction?utm_campaign=inapp-usecase-multichannel',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <GetStartedLink href={ROUTES.INTEGRATIONS_CREATE} target="_blank" rel="noopener noreferrer">
              {' Integration store'}
            </GetStartedLink>
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
            <StepText>Novu has prepared workflow templates. </StepText>
            <OpenWorkflowButton blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}>Customize</OpenWorkflowButton>
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
  Demo: () => <GetStartedAnimation useCase={OnboardingUseCasesTabsEnum.MULTI_CHANNEL} />,
};
