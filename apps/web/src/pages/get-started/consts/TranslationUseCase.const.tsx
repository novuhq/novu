import { ROUTES } from '@novu/shared-web';

import { GetStartedAnimation } from '../components/GetStartedAnimation';
import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';

export const TranslationUseCaseConst: OnboardingUseCase = {
  title: 'Translate content',
  type: OnboardingUseCasesTabsEnum.MULTI_CHANNEL,
  description:
    'Upload translations to use them as variables or for auto-upload in the editor in a workflow. ' +
    'This feature is available for business and enterprise plan.',
  useCaseLink: 'https://docs.novu.co/content-creation-design/translations',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <GetStartedLink href={ROUTES.INTEGRATIONS}> Integration store</GetStartedLink>
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
            <GetStartedLink children={' Translations page'} href={ROUTES.TRANSLATIONS} />
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
              {
                'Update content with {{i18n variables}} in your messages. These variables will automatically adapt to subscribers locale.'
              }
            </StepText>
          </StepDescription>
        );
      },
    },
  ],
  // FIXME: switch with TRANSLATION animation when available
  Demo: () => <GetStartedAnimation useCase={OnboardingUseCasesTabsEnum.MULTI_CHANNEL} />,
};
