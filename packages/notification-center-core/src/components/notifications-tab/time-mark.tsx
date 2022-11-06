import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';
import { formatDistanceToNow } from 'date-fns';
import * as dateFnsLocales from 'date-fns/locale';
import { IMessage } from '@novu/shared';

import { getTheme } from '../../theme';

@Component({
  tag: 'time-mark',
})
export class TimeMark {
  @Prop() notification: IMessage;

  render() {
    const theme = getTheme();
    const unseen = !this.notification.seen;
    const textContent = formatDistanceToNow(new Date(this.notification.createdAt), {
      addSuffix: true,
      // TODO: should be based on lang check useTranslations
      locale: dateFnsLocales.enUS,
    });

    return (
      <span
        class={css`
          min-width: 55px;
          font-size: 12px;
          font-weight: 400;
          opacity: 0.5;
          line-height: 14.4px;
          color: ${unseen
            ? theme?.notificationItem?.unseen?.timeMarkFontColor
            : theme?.notificationItem?.seen?.timeMarkFontColor};
        `}
      >
        {textContent}
      </span>
    );
  }
}
