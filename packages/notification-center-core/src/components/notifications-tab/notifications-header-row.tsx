import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';

import { getTheme } from '../../theme';
import { UnseenBadge } from '../atoms/unseen-badge';

const notificationsRow = css`
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
`;

const notificationsTitle = css`
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
`;

@Component({
  tag: 'notifications-header-row',
})
export class NotificationsHeaderRow {
  @Prop() unseenCount: number;
  @Prop() showUnseenBadge: boolean;

  render() {
    const theme = getTheme();

    return (
      <div class={notificationsRow}>
        {/* TODO: translations */}
        <span
          class={notificationsTitle}
          style={{ color: theme.header.fontColor }}
          data-test-id="notifications-header-title"
        >
          Notifications
        </span>
        {this.showUnseenBadge && <UnseenBadge>{this.unseenCount}</UnseenBadge>}
      </div>
    );
  }
}
