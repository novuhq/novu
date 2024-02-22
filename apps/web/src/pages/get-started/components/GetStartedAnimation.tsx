import { FC, useEffect } from 'react';
import { useRive, useStateMachineInput, decodeFont, FontAsset } from '@rive-app/react-canvas';
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
    // https://help.rive.app/runtimes/loading-assets#handling-assets
    assetLoader: (asset, bytes) => {
      /*
       * If the asset has a `cdnUuid`, return false to let the runtime handle
       * loading it in from a CDN. Or if there are bytes found for the asset
       * (aka, it was embedded), return false as there's no work needed here
       */
      if (asset.cdnUuid.length > 0 || bytes.length > 0) {
        return false;
      }

      /*
       * Here, we load a font asset with a random font on load of the Rive file
       * and return true, because this callback handler is responsible for loading
       * the asset, as opposed to the runtime
       */
      if (asset.isFont) {
        /*
         * decodeFont creates a Rive-specific Font object that `setFont()` takes
         * on the asset from assetLoader
         */
        fetch('/fonts/Lato.ttf').then(async (res) => {
          const font = await decodeFont(new Uint8Array(await res.arrayBuffer()));
          (asset as FontAsset).setFont(font);

          /*
           * Be sure to call unref to release any references.
           * This allows the engine to clean it up when it is not used by any more animations.
           */
          font.unref();

          return;
        });

        return true;
      } else {
        return false;
      }
    },
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
