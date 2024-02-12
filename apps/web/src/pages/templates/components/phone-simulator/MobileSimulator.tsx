import { useState } from 'react';

import { PhonePlatformSwitch } from './PhonePlatformSwitch';
import { IOSIndicatorsIcon } from './IOSIndicatorsIcon';
import { AndroidIndicatorsIcon } from './AndroidIndicatorsIcon';
import { IOSKeyboard } from './IOSKeyboard';
import { AndroidKeyboard } from './AndroidKeyboard';
import { useMantineColorScheme } from '@mantine/core';
import {
  IndicatorsContainer,
  MobileSimulatorBody,
  Notch,
  SwitchContainer,
  TimeIconStyled,
  Camera,
} from './MobileSimulator.styles';

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
        <PhonePlatformSwitch isIOS={isIOS} onChange={() => setIsIOS((old) => !old)} />
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
