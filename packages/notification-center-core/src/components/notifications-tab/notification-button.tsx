import { Component, Host, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';

import { getTheme } from '../../theme';
import { IMessageAction } from '../../types';

const textStyles = css`
  white-space: nowrap;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
`;

@Component({
  tag: 'notification-button',
})
export class NotificationButton {
  @Prop() messageAction: IMessageAction;
  @Prop() index: number;

  render() {
    const theme = getTheme();
    const messageButton = this.messageAction.buttons[this.index];
    const buttonStyle = theme.notificationItem.buttons[messageButton.type];
    const buttonText = messageButton?.content ? messageButton.content : '';

    return (
      <Host
        class={css`
          position: relative;
          line-height: 1;
          background: ${buttonStyle.backGroundColor};
          color: ${buttonStyle.fontColor};
          font-family: ${buttonStyle.fontFamily};
          cursor: pointer;
          user-select: none;
          text-decoration: none;
          box-shadow: none;
          display: flex;
          justify-content: center;
          margin-left: 5px;
          margin-right: 5px;
          height: 30px;
          width: 100%;
          font-weight: 700;
          font-size: 12px;
          border-radius: 7px;
          border: 0;

          &:not(:disabled):active {
            transform: translateY(1px);
          }
        `}
      >
        <span class={textStyles}>{buttonText}</span>
      </Host>
    );
  }
}
