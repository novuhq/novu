import { Component, Event, EventEmitter, h } from '@stencil/core';
import { css } from '@emotion/css';
import { getTheme } from '../../theme';

const headerStyles = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 55px;
  gap: 10px;
`;

const titleStyles = css`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: left;
`;

@Component({
  tag: 'user-preferences-header',
})
export class UserPreferencesHeader {
  @Event() backButtonClick?: EventEmitter<MouseEvent | TouchEvent>;

  backBtnClickHandler = (e: MouseEvent | TouchEvent) => {
    this.backButtonClick.emit(e);
  };

  render() {
    const theme = getTheme();

    return (
      <div class={headerStyles}>
        <div
          onClick={this.backBtnClickHandler}
          onTouchEnd={this.backBtnClickHandler}
          style={{
            marginLeft: '15px',
            cursor: 'pointer',
            color: theme.header.fontColor,
            width: '10px',
            height: '16px',
          }}
          data-test-id="go-back-btn"
        >
          <arrow-left />
        </div>
        {
          // TODO: translations
        }
        <span class={titleStyles} style={{ color: theme.header.fontColor }}>
          Settings
        </span>
      </div>
    );
  }
}
