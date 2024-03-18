import { ROUTES } from '@novu/shared-web';

import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { GetStartedAnimation } from '../components/GetStartedAnimation';

export const TranslationUseCaseConst: OnboardingUseCase = {
  title: 'Translate content',
  type: OnboardingUseCasesTabsEnum.TRANSLATION,
  description:
    'Upload translations to use them as variables or for auto-upload in the editor in a workflow. ' +
    'This feature is available for business and enterprise plan.',
  useCaseLink: 'https://docs.novu.co/content-creation-design/translations?utm_campaign=inapp-usecase-translation',
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
              {' '}
              Integration store
            </GetStartedLink>
            <StepText>.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Add a translation group',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Add a translation group and specify the languages in the</StepText>
            <GetStartedLink
              children={' Translations page'}
              href={ROUTES.TRANSLATIONS}
              target="_blank"
              rel="noopener noreferrer"
            />
            <StepText>.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Upload JSON files with languages',
      Description: function () {
        return (
          <StepDescription>
            <StepText>Upload JSON files with multiple languages to the translations group.</StepText>
          </StepDescription>
        );
      },
    },
    {
      title: 'Update content with translation variables',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              {'Update content with {{i18n variables}} in your messages. ' +
                "These variables will automatically adapt to a subscriber's locale."}
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  Demo: () => <GetStartedAnimation useCase={OnboardingUseCasesTabsEnum.TRANSLATION} />,
};
