import React, { useState } from 'react';
import { useNovuThemeProvider } from '../../../../hooks';
import { LoadingOverlay, Switch } from '@mantine/core';
import chroma from 'chroma-js';
import { getChannel } from './channels';
import styled from 'styled-components';
import { switchStyles, Text } from './styles';
import { getLinearGradientColorStopValues } from '../../../../shared/utils/getLinearGradientColorStopValues';

interface IChannelPreferenceProps {
  type: string;
  active: boolean;
  handleUpdateChannelPreference: (type: string, checked: boolean) => void;
  disabled: boolean;
}
export function ChannelPreference({ type, active, disabled, handleUpdateChannelPreference }: IChannelPreferenceProps) {
  const { label, Icon } = getChannel(type);
  const { theme } = useNovuThemeProvider();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const baseTheme = theme?.userPreferences;
  const iconColor = baseTheme?.accordionItem?.icon;
  const fontColor = baseTheme?.accordionItem?.fontColor;

  const updateChannel = async (checked: boolean) => {
    setIsLoading(true);

    await handleUpdateChannelPreference(type, checked);

    setIsLoading(false);
  };

  return (
    <ChannelItemWrapper data-test-id="channel-preference-item">
      <LeftContentWrapper>
        <Icon style={{ color: active ? iconColor.active : iconColor.inactive }} />
        <Text size={'md'} color={active ? fontColor.active : fontColor.inactive}>
          {label}
        </Text>
      </LeftContentWrapper>
      <SwitchWrapper>
        <LoadingOverlay
          visible={isLoading}
          data-test-id="channel-preference-item-loader"
          loaderProps={{
            size: 'xs',
            color:
              theme.loaderColor.indexOf('gradient') === -1
                ? theme.loaderColor
                : chroma.average(getLinearGradientColorStopValues(theme.loaderColor)),
          }}
          overlayOpacity={0.3}
          overlayColor="transparent"
          sx={{ justifyContent: active ? 'right' : 'left', marginLeft: '2.5px', marginRight: '2px' }}
        />
        <Switch
          data-test-id="channel-preference-item-toggle"
          styles={switchStyles(baseTheme)}
          disabled={disabled && !isLoading}
          checked={active}
          onChange={(e) => updateChannel(e.target.checked)}
        />
      </SwitchWrapper>
    </ChannelItemWrapper>
  );
}

const ChannelItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LeftContentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 15px;
`;

const SwitchWrapper = styled.div`
  width: inherit;
  height: inherit;
  position: relative;

  svg circle {
    stroke-opacity: 0;
  }
`;
