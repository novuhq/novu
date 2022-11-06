import { Component, h, Prop } from '@stencil/core';
import { css } from '@emotion/css';

import { getTheme } from '../../theme';
import { IUserPreferenceSettings } from '../../types';

const channelPreferencesWrapperStyles = css`
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 20px;
`;

const dividerStyles = css`
  border: 0;
  border-top-width: 1px;
  border-top-style: solid;
  margin: 0;
`;

@Component({
  tag: 'channel-preferences',
})
export class ChannelPreferences {
  @Prop() setting: IUserPreferenceSettings;

  render() {
    const theme = getTheme();
    const baseTheme = theme?.userPreferences;
    const channelsPreference = this.setting?.preference?.channels;
    const channelsKeys = Object.keys(channelsPreference);
    // TODO:
    const loadingUpdate = false;

    return (
      <div class={channelPreferencesWrapperStyles}>
        <div class={dividerStyles} style={{ borderTopColor: baseTheme?.accordion?.dividerColor }}></div>
        {channelsKeys.map((channel) => (
          <channel-preference
            key={channel}
            type={channel}
            active={channelsPreference[channel]}
            disabled={loadingUpdate}
          />
        ))}
      </div>
    );
  }
}
