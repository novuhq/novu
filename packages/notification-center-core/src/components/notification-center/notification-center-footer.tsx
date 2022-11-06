import { Component, h } from '@stencil/core';
import { css } from '@emotion/css';
import { getTheme } from '../../theme';

const footerStyles = css`
  text-align: center;
  border-radius: 7px;
  margin-top: 10px;
  height: 25px;
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
  direction: ltr;

  svg {
    width: 100%;
    height: 100%;
  }
`;

const textStyles = css`
  font-size: 10px;
  font-weight: 400;
`;

@Component({
  tag: 'notification-center-footer',
})
export class NotificationCenterFooter {
  render() {
    const theme = getTheme();

    // TODO: translations
    return (
      <div class={footerStyles}>
        <span class={textStyles} style={{ color: theme.footer.logoPrefixFontColor }}>
          Powered By
        </span>
        <a
          href="https://novu.co?utm_source=in-app-widget"
          rel="noreferrer"
          target="_blank"
          style={{ display: 'flex', color: theme.footer.logoTextColor, height: '16px', width: '60px' }}
        >
          <novu-icon />
        </a>
      </div>
    );
  }
}
