import { ChannelTypeEnum } from '@novu/shared';
import { ROUTES } from '@novu/shared-web';

import { useGetIntegrationsByChannel } from '../../integrations/useGetIntegrationsByChannel';
import { GetStartedAnimation } from '../components/GetStartedAnimation';
import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingWorkflowRouteEnum, OnboardingUseCase } from './types';
import { OpenWorkflowButton } from '../components/OpenWorkflowButton';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

const USECASE_BLUEPRINT_IDENTIFIER = 'get-started-in-app';

export const InAppUseCaseConst: OnboardingUseCase = {
  title: 'In-app notifications center',
  type: OnboardingUseCasesTabsEnum.IN_APP,
  description:
    "Utilize Novu's pre-built customizable in-app component. " +
    'Or opt for the headless library to create your own in-app notification center.',
  useCaseLink: 'https://docs.novu.co/channels-and-providers/in-app/introduction?utm_campaign=inapp-usecase-inapp',
  steps: [
    {
      title: 'Configure In-App provider',
      Description: function () {
        const { integrations } = useGetIntegrationsByChannel({ channelType: ChannelTypeEnum.IN_APP });

        const getInAppIntegrationUrl = () => {
          const inAppIntegration = integrations?.[0];
          if (!inAppIntegration) {
            return `${ROUTES.INTEGRATIONS_CREATE}?scrollTo=${ChannelTypeEnum.IN_APP}`;
          }

          return `${ROUTES.INTEGRATIONS}/${inAppIntegration._id}`;
        };

        return (
          <StepDescription>
            <GetStartedLink href={getInAppIntegrationUrl()} target="_blank" rel="noopener noreferrer">
              Create In-app provider
            </GetStartedLink>
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
            <StepText>Novu pre-built a workflow for testing. </StepText>
            <OpenWorkflowButton blueprintIdentifier={USECASE_BLUEPRINT_IDENTIFIER}>Customize</OpenWorkflowButton>
            <StepText> it or create a new one on the Workflows page. </StepText>
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
  Demo: () => <GetStartedAnimation useCase={OnboardingUseCasesTabsEnum.IN_APP} />,
};
