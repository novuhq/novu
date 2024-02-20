import { FC } from 'react';
import { useRive } from '@rive-app/react-canvas';

interface IGetStartedAnimationProps {
  a?: any;
}

export const GetStartedAnimation: FC<IGetStartedAnimationProps> = (props) => {
  const { rive, RiveComponent } = useRive({
    src: 'https://cdn.rive.app/animations/vehicles.riv',
    stateMachines: 'bumpy',
    autoplay: false,
  });

  return <RiveComponent onMouseEnter={() => rive && rive.play()} onMouseLeave={() => rive && rive.pause()} />;
};
