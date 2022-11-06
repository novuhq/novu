import { Component, Prop, h } from '@stencil/core';
import { css, cx } from '@emotion/css';

import { getTheme } from '../../theme';
import { getChannel } from '../../utils/channels';

const channelItemWrapperStyles = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const leftContentWrapperStyles = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 15px;
  width: 100%;

  > div:last-child {
    justify-self: end;
  }
`;

const savedHolderStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-left: auto;
`;

const rightContentWrapperStyles = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 13px;
`;

const savedTextStyles = css`
  color: #4d9980;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 14.4px;
  text-align: left;
`;

@Component({
  tag: 'channel-preference',
})
export class ChannelPreference {
  @Prop() type: string;
  @Prop() active?: boolean;
  @Prop() disabled?: boolean;

  render() {
    // TODO: implement switch change and saved text
    const saved = true;
    const { label, icon } = getChannel(this.type);
    const theme = getTheme();
    const baseTheme = theme?.userPreferences;
    const iconColor = baseTheme?.accordionItem?.icon;
    const fontColor = baseTheme?.accordionItem?.fontColor;

    return (
      <div class={channelItemWrapperStyles} data-test-id="channel-preference-item">
        <div
          class={cx(
            leftContentWrapperStyles,
            css`
              svg {
                color: ${this.active ? iconColor.active : iconColor.inactive};
                width: 30px;
              }

              span {
                color: ${this.active ? fontColor.active : fontColor.inactive};
              }
            `
          )}
        >
          {icon()}
          <workflow-text text={label} size="lg" color={this.active ? fontColor.active : fontColor.inactive} />
        </div>
        <div class={rightContentWrapperStyles}>
          {saved && (
            <div class={savedHolderStyles}>
              <check-icon />
              <span class={savedTextStyles}>Saved</span>
            </div>
          )}
          <switch-component dataTestId="channel-preference-item-toggle" onChange={console.log} />
        </div>
      </div>
    );
  }
}
