import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { FC, ReactNode } from 'react';
import { GetStartedAnimation } from './GetStartedAnimation';

type GetStartedAnimationElement = ReactNode;

interface IGetStartedAnimationContainerProps {
  assetDark: GetStartedAnimationElement;
  assetLight: GetStartedAnimationElement;
}

// TODO: add styles for consistent display of animations across tabs
const AnimationContainer = styled.div`
  height: 520px;
`;

export const GetStartedAnimationContainer: FC<IGetStartedAnimationContainerProps> = ({ assetDark, assetLight }) => {
  const { colorScheme } = useTheme();
  const isDarkMode = colorScheme === 'dark';

  // TODO remove Placeholder wrapping when assets are available
  return (
    <AnimationContainer>
      <GetStartedAnimation />
    </AnimationContainer>
  );
};

function Placeholder({ placeholder }: { placeholder: ReactNode }) {
  const { colorScheme, colors } = useTheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <div
      style={{
        height: '520px',
        backgroundColor: isDarkMode ? colors.dark[4] : colors.gray[4],
        display: 'flex',
        borderRadius: '2%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1>{placeholder}</h1>
    </div>
  );
}
