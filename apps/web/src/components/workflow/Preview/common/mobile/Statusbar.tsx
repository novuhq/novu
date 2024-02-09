import { Group } from '@mantine/core';
import { colors, Text } from '@novu/design-system';
import {
  AndroidBattery,
  AndroidNetwork,
  AndroidWifi,
  IphoneBattery,
  IphoneCameraNotch,
  IphoneNetwork,
  IphoneWifi,
} from '../icons';
import {
  AndroidCameraDotStyled,
  AndroidcameraNotchStyled,
  IphonecameraNotchStyled,
  Statusbarstyled,
} from './Mobile.styles';

import { format } from 'date-fns';
import { When } from '../../../../utils/When';

export function Statusbar({ isAndroid }: { isAndroid: boolean }) {
  return (
    <div>
      <When truthy={!isAndroid}>
        <IphonecameraNotchStyled isAndroid={isAndroid}>
          <IphoneCameraNotch />
        </IphonecameraNotchStyled>
      </When>

      <Statusbarstyled isAndroid={isAndroid}>
        <When truthy={!isAndroid}>
          <Text color={colors.black}>{format(new Date(), 'hh:mm')}</Text>
          <Group
            spacing={8}
            align="flex-start"
            noWrap
            sx={{
              alignSelf: 'stretch',
            }}
          >
            <IphoneNetwork />
            <IphoneWifi />
            <IphoneBattery />
          </Group>
        </When>

        <When truthy={isAndroid}>
          <AndroidcameraNotchStyled>
            <AndroidCameraDotStyled />
          </AndroidcameraNotchStyled>

          <Group
            spacing={8}
            align="flex-start"
            noWrap
            sx={{
              alignSelf: 'stretch',
            }}
          >
            <AndroidNetwork />
            <AndroidWifi />
            <AndroidBattery />
          </Group>
        </When>
      </Statusbarstyled>
    </div>
  );
}
