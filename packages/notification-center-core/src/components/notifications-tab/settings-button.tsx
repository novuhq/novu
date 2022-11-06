import { Component, h } from '@stencil/core';
import { css } from '@emotion/css';

const settingsButtonStyles = css`
  border: 1px solid transparent;
  color: #495057;
  background-color: transparent;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji,
    Segoe UI Emoji;
  position: relative;
  appearance: none;
  box-sizing: border-box;
  height: 20px;
  min-height: 20px;
  width: 20px;
  min-width: 20px;
  border-radius: 4px;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

@Component({
  tag: 'settings-button',
})
export class SettingsButton {
  render() {
    // TODO: showUserPreferences
    const showUserPreferences = true;

    return (
      <button
        class={settingsButtonStyles}
        style={{ display: showUserPreferences ? 'inline-block' : 'none' }}
        data-test-id="user-preference-cog"
      >
        <cog-icon></cog-icon>
      </button>
    );
  }
}
