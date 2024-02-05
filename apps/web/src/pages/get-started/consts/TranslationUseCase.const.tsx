import { Link, StepDescription } from './shared';
import { OnboardingUseCase } from './types';

export const TranslationUseCaseConst: OnboardingUseCase = {
  title: 'Translate content',
  description:
    'Upload translations to use them as variables or for auto-upload in the editor in a workflow.' +
    'This feature is available for business and enterprise plan.',
  steps: [
    {
      title: 'Configure providers',
      Description: function () {
        return (
          <span>
            <StepDescription>
              Novu has set up trial email and SMS providers for you. To expand your options, add more providers in the
            </StepDescription>
            <Link text={' Integration store '} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>.</StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Add a translation group',
      Description: function () {
        return (
          <span>
            <StepDescription>Add a translation group and specify the languages in the</StepDescription>
            <Link text={' Translations page'} href={'https://mantine.dev/core/timeline/'} />
            <StepDescription>.</StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Upload JSON files with languages',
      Description: function () {
        return (
          <span>
            <StepDescription>Upload JSON files with multiple languages to the translations group.</StepDescription>
          </span>
        );
      },
    },
    {
      title: 'Update content with translation variables',
      Description: function () {
        return (
          <span>
            <StepDescription>
              {
                'Update content with {{i18n variables}} in your messages. These variables will automatically adapt to subscribers locale.'
              }
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
