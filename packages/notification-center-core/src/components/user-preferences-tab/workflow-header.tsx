import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';

import { getTheme } from '../../theme';
import { IUserPreferenceSettings } from '../../types';
import { getEnabledChannels } from '../../utils/channels';

const workflowHeaderStyles = css`
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 5px;
  align-items: flex-start;
`;

@Component({
  tag: 'workflow-header',
})
export class WorkflowHeader {
  @Prop() setting: IUserPreferenceSettings;

  render() {
    const theme = getTheme();
    const baseTheme = theme?.userPreferences;
    const channelsPreference = this.setting?.preference?.channels;

    return (
      <div class={workflowHeaderStyles}>
        <workflow-text text={this.setting.template?.name} size="lg" color={baseTheme?.accordion?.fontColor} />
        <workflow-text
          text={getEnabledChannels(channelsPreference)}
          size="sm"
          color={baseTheme?.accordion?.secondaryFontColor}
          dataTestId="workflow-active-channels"
        />
      </div>
    );
  }
}
