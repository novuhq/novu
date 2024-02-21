import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { FC, ReactNode } from 'react';

type GetStartedAnimationElement = ReactNode;

interface IGetStartedAnimationContainerProps {
  children?: React.ReactNode;
  assetDark: GetStartedAnimationElement;
  assetLight: GetStartedAnimationElement;
}

// TODO: add styles for consistent display of animations across tabs
const AnimationContainer = styled.div``;

export const GetStartedAnimationContainer: FC<IGetStartedAnimationContainerProps> = ({
  assetDark,
  assetLight,
  children,
}) => {
  const { colorScheme } = useTheme();
  const isDarkMode = colorScheme === 'dark';

  const Assets = isDarkMode ? <Placeholder placeholder={assetDark} /> : <Placeholder placeholder={assetLight} />;
  // TODO remove Placeholder wrapping when assets are available

  return <AnimationContainer>{children ? children : Assets}</AnimationContainer>;
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
