import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';
import { IMessage } from '@novu/shared';

import { getTheme } from '../../theme';

const itemContainer = css`
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: normal;
  width: 100%;
`;

@Component({
  tag: 'notifications-list-item',
})
export class NotificationsListItem {
  @Prop() notification: IMessage;

  render() {
    const theme = getTheme();
    const unseen = !this.notification.seen;

    const unseenNotificationStyles = css`
      background: ${theme.notificationItem?.unseen?.background};
      box-shadow: ${theme.notificationItem?.unseen?.boxShadow};
      color: ${theme.notificationItem?.unseen?.fontColor};
      font-weight: 700;

      &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        width: 5px;
        border-radius: 7px 0 0 7px;
        background: ${theme.notificationItem?.unseen?.notificationItemBeforeBrandColor};
      }
    `;
    const seenNotificationStyles = css`
      color: ${theme.notificationItem?.seen?.fontColor};
      background: ${theme.notificationItem?.seen?.background};
      font-weight: 400;
      font-size: 14px;
    `;
    const wrapper = css`
      padding: 15px;
      position: relative;
      display: flex;
      line-height: 20px;
      justify-content: space-between;
      align-items: center;
      border-radius: 7px;
      margin: 10px 15px;

      &:hover {
        cursor: pointer;
      }

      ${unseen ? unseenNotificationStyles : seenNotificationStyles}
    `;

    return (
      <div class={wrapper}>
        <div class={itemContainer}>
          <div
            style={{ lineHeight: '16px' }}
            data-test-id="notification-content"
            innerHTML={this.notification.content as string}
          ></div>
          <time-mark notification={this.notification}></time-mark>
          <action-wrapper notification={this.notification}></action-wrapper>
        </div>
        <settings-action></settings-action>
      </div>
    );
  }
}
