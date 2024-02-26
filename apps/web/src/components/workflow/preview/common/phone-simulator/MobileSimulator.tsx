import { useState } from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { ChannelTypeEnum } from '@novu/shared';
import { When } from '@novu/design-system';

import { PhonePlatformSwitch } from './PhonePlatformSwitch';
import {
  IndicatorsContainer,
  MobileSimulatorBody,
  Notch,
  SwitchContainer,
  TimeIconStyled,
  Camera,
} from './MobileSimulator.styles';
import { AndroidIndicatorsIcon, IOSIndicatorsIcon, IOSKeyboard, AndroidKeyboard } from '../icons';

export const MobileSimulator = ({
  children,
  withBackground,
}: {
  withBackground: boolean;
  children: React.ReactNode;
}) => {
  const [isIOS, setIsIOS] = useState(true);
  const { colorScheme } = useMantineColorScheme();

  return (
    <MobileSimulatorBody isIOS={isIOS} withBackground={withBackground}>
      {isIOS ? <Notch /> : <Camera />}
      <IndicatorsContainer>
        <TimeIconStyled isVisible={isIOS} />
        {isIOS ? <IOSIndicatorsIcon /> : <AndroidIndicatorsIcon />}
      </IndicatorsContainer>
      <SwitchContainer>
        <PhonePlatformSwitch isIOS={isIOS} onChange={() => setIsIOS((old) => !old)} />
      </SwitchContainer>
      {children}
      <When truthy={!withBackground}>
        {isIOS ? (
          <IOSKeyboard isDarkMode={colorScheme === 'dark'} />
        ) : (
          <AndroidKeyboard isDarkMode={colorScheme === 'dark'} />
        )}
      </When>
    </MobileSimulatorBody>
  );
};

export default MobileSimulator;
