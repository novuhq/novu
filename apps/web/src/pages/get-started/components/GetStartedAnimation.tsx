import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { Alignment, Fit, Layout, useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { FC, useEffect } from 'react';
import { OnboardingUseCasesTabsEnum } from '../consts/OnboardingUseCasesTabsEnum';

interface IGetStartedAnimationProps {
  useCase: OnboardingUseCasesTabsEnum;
}

// uses `public` as the default base directory
const ROOT_ANIMATION_PATH = `animations/get-started`;
const STATE_MACHINE_NAME = 'SM';
const STATE_MACHINE_INPUT_NAME = 'white theme';

const getAnimationPath = (useCase: OnboardingUseCasesTabsEnum) => `${ROOT_ANIMATION_PATH}/${useCase}.riv`;

const AnimationContainer = styled.div`
  /* taken from Figma to try to get a good estimate on aspect ratio */
  aspect-ratio: 540 / 472;
  max-width: 62.5rem;
  margin: auto;
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
    colorScheme === 'light'
  );

  // change animation color scheme input on color scheme change
  useEffect(() => {
    if (!stateMachineInput) {
      return;
    }

    stateMachineInput.value = colorScheme === 'light';
  }, [colorScheme, stateMachineInput]);

  return (
    <AnimationContainer>
      <RiveComponent />
    </AnimationContainer>
  );
};
