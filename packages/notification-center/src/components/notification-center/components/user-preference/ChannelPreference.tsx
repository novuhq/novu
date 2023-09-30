import React, { useState } from 'react';
import { LoadingOverlay, Switch } from '@mantine/core';
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';

import { useNovuTheme } from '../../../../hooks';
import { getChannel } from './channels';
import { switchStyles, Text } from './styles';
import { Check } from '../../../../shared/icons/Check';
import { colors } from '../../../../shared/config/colors';
import { useStyles } from '../../../../store/styles';

const iconClassName = (
  active: boolean,
  iconColor: {
    active?: string;
    inactive?: string;
  }
) => css`
  color: ${active ? iconColor.active : iconColor.inactive};
  width: 30px;
`;

const channelLabelClassName = (
  active: boolean,
  fontColor: {
    active?: string;
    inactive?: string;
  }
) => css`
  color: ${active ? fontColor.active : fontColor.inactive};
`;

const successClassName = css`
  color: ${colors.success};
`;

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
  const [
    switchRootStyles,
    switchInputStyles,
    switchTrackStyles,
    switchThumbStyles,
    itemContentIconStyles,
    itemContentChannelLabelStyles,
    itemContentSuccessStyles,
  ] = useStyles([
    'switch.root',
    'switch.input',
    'switch.track',
    'switch.thumb',
    'preferences.item.content.icon',
    'preferences.item.content.channelLabel',
    'preferences.item.content.success',
  ]);
  const channelSwitchStyles = switchStyles(baseTheme);
  const channelSwitchClassNames: Record<'root' | 'input' | 'track' | 'thumb', string> = {
    root: css(switchRootStyles),
    input: css(switchInputStyles),
    track: css(switchTrackStyles),
    thumb: css(switchThumbStyles),
  };

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
        <Icon
          className={cx('nc-preferences-item-icon', iconClassName(active, iconColor), css(itemContentIconStyles))}
        />
        <Text
          size={'md'}
          className={cx(
            'nc-preferences-channel-label',
            channelLabelClassName(active, fontColor),
            css(itemContentChannelLabelStyles)
          )}
        >
          {label}
        </Text>
      </LeftContentWrapper>
      <RightContentWrapper>
        {showSaved && (
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Check color={colors.success} />
            <Text
              size="sm"
              className={cx('nc-preferences-item-success', successClassName, css(itemContentSuccessStyles))}
            >
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
              color: theme.loaderColor,
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
            styles={channelSwitchStyles}
            classNames={channelSwitchClassNames}
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
