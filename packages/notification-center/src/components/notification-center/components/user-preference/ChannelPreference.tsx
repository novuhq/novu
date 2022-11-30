import React, { useState } from 'react';
import { LoadingOverlay, Switch } from '@mantine/core';
import styled from 'styled-components';
import chroma from 'chroma-js';
import { useNovuTheme } from '../../../../hooks';
import { getChannel } from './channels';
import { switchStyles, Text } from './styles';
import { getLinearGradientColorStopValues } from '../../../../shared/utils/getLinearGradientColorStopValues';
import { Check } from '../../../../shared/icons/Check';
import { colors } from '../../../../shared/config/colors';

interface IChannelPreferenceProps {
  type: string;
  active: boolean;
  handleUpdateChannelPreference: (type: string, checked: boolean) => void;
  disabled: boolean;
}
export function ChannelPreference({ type, active, disabled, handleUpdateChannelPreference }: IChannelPreferenceProps) {
  const { label, Icon } = getChannel(type);
  const { theme } = useNovuTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSaved, setShowSaved] = useState<boolean>(false);
  const baseTheme = theme?.userPreferences;
  const iconColor = baseTheme?.accordionItem?.icon;
  const fontColor = baseTheme?.accordionItem?.fontColor;

  const updateChannel = async (checked: boolean) => {
    setIsLoading(true);

    await handleUpdateChannelPreference(type, checked);

    setIsLoading(false);

    setShowSaved(true);
    setTimeout(() => {
      setShowSaved(false);
    }, 1500);
  };

  return (
    <ChannelItemWrapper data-test-id="channel-preference-item">
      <LeftContentWrapper>
        <Icon style={{ color: active ? iconColor.active : iconColor.inactive, width: '30px' }} />
        <Text size={'md'} color={active ? fontColor.active : fontColor.inactive}>
          {label}
        </Text>
      </LeftContentWrapper>
      <RightContentWrapper>
        {showSaved && (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Check color={colors.success} />
            <Text size="sm" color={colors.success}>
              Saved
            </Text>
          </div>
        )}
        <SwitchWrapper>
          <LoadingOverlay
            visible={isLoading}
            data-test-id="channel-preference-item-loader"
            loaderProps={{
              size: 15,
              color:
                theme.loaderColor.indexOf('gradient') === -1
                  ? theme.loaderColor
                  : chroma.average(getLinearGradientColorStopValues(theme.loaderColor)),
            }}
            overlayOpacity={0.3}
            overlayColor="transparent"
            sx={{
              justifyContent: active ? 'right' : 'left',
              marginLeft: '3px',
              marginRight: '1.5px',
              marginTop: '1px',
            }}
          />
          <Switch
            data-test-id="channel-preference-item-toggle"
            styles={switchStyles(baseTheme)}
            disabled={disabled && !isLoading}
            checked={active}
            onChange={(e) => updateChannel(e.target.checked)}
          />
        </SwitchWrapper>
      </RightContentWrapper>
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

const RightContentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 13px;
`;

const SwitchWrapper = styled.div`
  width: inherit;
  height: inherit;
  position: relative;

  svg circle {
    stroke-opacity: 0;
  }
`;
