import { ROUTES } from '@novu/shared-web';
import { GetStartedAnimationContainer } from '../components/GetStartedAnimationContainer';
import { Link, StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';

export const TranslationUseCaseConst: OnboardingUseCase = {
  title: 'Translate content',
  description:
    'Upload translations to use them as variables or for auto-upload in the editor in a workflow. ' +
    'This feature is available for business and enterprise plan.',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <StepDescription>
            <StepText>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepText>
            <Link href={ROUTES.INTEGRATIONS}> Integration store</Link>
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
            <Link children={' Translations page'} href={ROUTES.TRANSLATIONS} />
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
  Demo: () => <GetStartedAnimationContainer assetDark={'Dark Placeholder'} assetLight={'Light Placeholder'} />,
};
