import { FC, useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useTheme } from '@emotion/react';
import { OnboardingUseCasesTabsEnum } from '../consts/OnboardingUseCasesTabsEnum';
import styled from '@emotion/styled';

interface IGetStartedAnimationProps {
  useCase: OnboardingUseCasesTabsEnum;
}

// uses `public` as the default base directory
const ROOT_ANIMATION_PATH = `animations/get-started`;
const STATE_MACHINE_NAME = 'SM';
const STATE_MACHINE_INPUT_NAME = 'white theme';

const getAnimationPath = (useCase: OnboardingUseCasesTabsEnum) => `${ROOT_ANIMATION_PATH}/${useCase}.riv`;

const AnimationContainer = styled.div`
  height: 520px;
`;

export const GetStartedAnimation: FC<IGetStartedAnimationProps> = ({ useCase }) => {
  const { colorScheme } = useTheme();
  const { rive, RiveComponent } = useRive({
    src: getAnimationPath(useCase),
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    /*
     * assetLoader: (asset, bytes) => {
     *   console.log('Tell our asset importer if we are going to load the asset contents', {
     *     name: asset.name,
     *     fileExtension: asset.fileExtension,
     *     cdnUuid: asset.cdnUuid,
     *     isFont: asset.isFont,
     *     isImage: asset.isImage,
     *     bytes,
     *   });
     */

    /*
     *   return true;
     * },
     */
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
