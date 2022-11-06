import { Component, Prop, h } from '@stencil/core';
import { css, cx } from '@emotion/css';
import chroma from 'chroma-js';

import { getTheme } from '../../theme';
import { getLinearGradientColorStopValues } from '../../utils/colors';

const holderStyles = css`
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const inputStyles = css`
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  position: relative;
  border-radius: 32px;
  min-width: 40px;
  margin: 0;
  transition-property: background-color, border-color;
  transition-timing-function: ease;
  transition-duration: 150ms;
  appearance: none;
  display: flex;
  align-items: center;
  font-size: 6px;
  font-weight: 600;
  width: 41px;
  height: 24px;
  border: transparent;

  &:checked {
    background: linear-gradient(0deg, #ff512f 0%, #dd2476 100%);

    &:before {
      transform: translateX(20px);
      border-color: #fff;
    }

    &:after {
      transform: translateX(-200%);
      content: '';
      color: #fff;
    }
  }

  &:disabled {
    opacity: 0.3;
  }

  &:before {
    z-index: 1;
    border-radius: 32px;
    box-sizing: border-box;
    content: '';
    display: block;
    background-color: #fff;
    border: 1px solid #dee2e6;
    transition: transform 150ms ease;
    transform: translateX(2px);
    border: transparent;
    width: 20px;
    height: 20px;
  }

  &:after {
    content: '';
    position: absolute;
    right: 10%;
    z-index: 0;
    height: 100%;
    display: flex;
    align-items: center;
    line-height: 0;
    transform: translateX(0);
    color: #868e96;
    transition: color 150ms ease;
  }
`;

const loadinStyles = css`
  width: 18px;
  height: 18px;
  position: absolute;
  top: 3px;
  z-index: 1;
  user-select: none;

  svg circle {
    stroke-opacity: 0;
  }
`;

@Component({
  tag: 'switch-component',
})
export class SwitchComponent {
  @Prop() dataTestId?: string;
  @Prop() checked?: boolean;
  @Prop() disabled?: boolean;
  @Prop() onChange: (e: Event) => void;

  render() {
    const theme = getTheme();
    const baseTheme = theme?.userPreferences;
    const loaderColor =
      theme.loaderColor.indexOf('gradient') === -1
        ? theme.loaderColor
        : chroma.average(getLinearGradientColorStopValues(theme.loaderColor)).hex();

    return (
      <div class={holderStyles}>
        <input
          type="checkbox"
          class={cx(
            inputStyles,
            css`
              background: ${baseTheme.accordionItem?.switch?.backgroundUnchecked};

              &:disabled:not(:checked) {
                background: ${baseTheme.accordionItem?.switch?.backgroundUnchecked};
              }
            `
          )}
          onChange={this.onChange}
          checked={this.checked}
          disabled={this.disabled}
          data-test-id={this.dataTestId}
        />
        <div
          class={cx(
            loadinStyles,
            css`
              ${this.checked ? 'right: 2px;' : 'left: 3px'};
            `
          )}
        >
          <loading-icon width="18px" height="18px" stroke={loaderColor} />
        </div>
      </div>
    );
  }
}
