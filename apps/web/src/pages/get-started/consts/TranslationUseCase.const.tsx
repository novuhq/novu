import { useMantineTheme } from '@mantine/core';
import { ROUTES } from '@novu/shared-web';
import styled from '@emotion/styled';

import { GetStartedLink, StepDescription, StepText } from './shared';
import { OnboardingUseCase } from './types';
import { OnboardingUseCasesTabsEnum } from './OnboardingUseCasesTabsEnum';
import { TranslationUseCaseImage } from '../components/TranslationsUsecaseImage';

const ImageContainer = styled.div`
  /* taken from Figma to try to get a good estimate on aspect ratio */
  aspect-ratio: 540 / 472;
  max-width: 62.5rem;
  margin: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

const TranslationUseCaseImageStyled = styled(TranslationUseCaseImage)`
  width: 52.5rem;
  margin-top: ${({ theme }) => (theme.colorScheme === 'dark' ? '3.75rem' : '3rem')};
  margin-left: 3rem;
`;

export const TranslationUseCaseConst: OnboardingUseCase = {
  title: 'Translate content',
  type: OnboardingUseCasesTabsEnum.TRANSLATION,
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
  // FIXME: switch with TRANSLATION animation when available
  Demo: () => {
    const { colorScheme } = useMantineTheme();

    return (
      <ImageContainer>
        <TranslationUseCaseImageStyled colorScheme={colorScheme} />
      </ImageContainer>
    );
  },
};
