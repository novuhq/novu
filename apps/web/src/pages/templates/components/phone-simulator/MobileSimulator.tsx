import { useState } from 'react';
import styled from '@emotion/styled';
import { colors, shadows } from '@novu/design-system';

import { PhonePlatformSwitch } from './PhonePlatformSwitch';
import { TimeIcon } from './TimeIcon';
import { IOSIndicatorsIcon } from './IOSIndicatorsIcon';
import { AndroidIndicatorsIcon } from './AndroidIndicatorsIcon';
import { IOSKeyboard } from './IOSKeyboard';
import { AndroidKeyboard } from './AndroidKeyboard';
import { useMantineColorScheme } from '@mantine/core';

const borderRadius = 40;
const MobileSimulatorBody = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 56px;
  width: 440px;
  height: 880px;
  min-height: 880px;
  border-radius: ${borderRadius}px;
  border: 24px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.BGLight)};
  box-shadow: ${shadows.dark};
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? '#4b4b51' : colors.white)};
`;

const Notch = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 20px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.BGLight)};
  border-radius: 0 0 20px 20px;
`;

const Camera = styled.div`
  position: absolute;
  top: 18px;
  left: 18px;
  width: 28px;
  height: 28px;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : '#cccccc')};
  border-radius: 50%;
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 4px;
    background: ${colors.white};
    opacity: 0.5;
    border-radius: 50%;
  }
`;

const IndicatorsContainer = styled.div`
  margin: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : '#cccccc')};
`;

const SwitchContainer = styled.div`
  display: flex;
  justify-content: center;
  z-index: 2;
`;

const TimeIconStyled = styled(({ isVisible }: { isVisible: boolean }) => (
  <TimeIcon style={{ opacity: isVisible ? 1 : 0 }} />
))``;

export const MobileSimulator: React.FC = ({ children }) => {
  const [isIOS, setIsIOS] = useState(true);
  const { colorScheme } = useMantineColorScheme();

  return (
    <MobileSimulatorBody>
      {isIOS ? <Notch /> : <Camera />}
      <IndicatorsContainer>
        <TimeIconStyled isVisible={isIOS} />
        {isIOS ? <IOSIndicatorsIcon /> : <AndroidIndicatorsIcon />}
      </IndicatorsContainer>
      <SwitchContainer>
        <PhonePlatformSwitch checked={isIOS} onChange={() => setIsIOS((old) => !old)} />
      </SwitchContainer>
      {children}
      {isIOS ? (
        <IOSKeyboard isDarkMode={colorScheme === 'dark'} />
      ) : (
        <AndroidKeyboard isDarkMode={colorScheme === 'dark'} />
      )}
    </MobileSimulatorBody>
  );
};

export default MobileSimulator;
