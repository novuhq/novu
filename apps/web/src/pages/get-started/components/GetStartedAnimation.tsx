import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { Alignment, Fit, Layout, useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { FC, useEffect } from 'react';
import { ColorScheme } from '@mantine/core';

import { OnboardingUseCasesTabsEnum } from '../consts/OnboardingUseCasesTabsEnum';

interface IGetStartedAnimationProps {
  useCase: OnboardingUseCasesTabsEnum;
}

/**
 * The animation theme enum is used to determine which color scheme to use for the animation.
 * The values are defined in the Rive file, which are following:
 * 0 - dark theme
 * 1 - new dark theme
 * 2 - light theme
 */
enum AnimationThemeEnum {
  LIGHT = 2,
  DARK = 0,
  NEW_DARK = 1,
}

// uses `public` as the default base directory
const ROOT_ANIMATION_PATH = `animations/get-started`;
const STATE_MACHINE_NAME = 'SM';
const STATE_MACHINE_INPUT_NAME = 'theme';

const getAnimationPath = (useCase: OnboardingUseCasesTabsEnum) => `${ROOT_ANIMATION_PATH}/${useCase}.riv`;

const getInputNumber = (colorScheme: ColorScheme) =>
  colorScheme === 'light' ? AnimationThemeEnum.LIGHT : AnimationThemeEnum.DARK;

const AnimationContainer = styled.div`
  /* taken from Figma to try to get a good estimate on aspect ratio */
  aspect-ratio: 540 / 472;
  max-width: 62.5rem;
  margin: auto;
  margin-top: -2.25rem;

  @media screen and (min-width: 1440px) {
    margin-top: -3rem;
  }

  @media screen and (min-width: 1600px) {
    margin-top: -4rem;
  }
`;

export const GetStartedAnimation: FC<IGetStartedAnimationProps> = ({ useCase }) => {
  const { colorScheme } = useTheme();
  const { rive, RiveComponent } = useRive({
    src: getAnimationPath(useCase),
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({ fit: Fit.FitWidth, alignment: Alignment.TopCenter }),
  });

  const stateMachineInput = useStateMachineInput(
    rive,
    STATE_MACHINE_NAME,
    STATE_MACHINE_INPUT_NAME,
    getInputNumber(colorScheme)
  );

  // change animation color scheme input on color scheme change
  useEffect(() => {
    if (!stateMachineInput) {
      return;
    }

    stateMachineInput.value = getInputNumber(colorScheme);
  }, [colorScheme, stateMachineInput]);

  return (
    <AnimationContainer>
      <RiveComponent />
    </AnimationContainer>
  );
};
