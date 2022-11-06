import { FunctionalComponent, h } from '@stencil/core';
import { cx, css } from '@emotion/css';

const badgeContainer = css`
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-decoration: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  border-radius: 100px;
  letter-spacing: 0.25px;
  cursor: default;
  text-overflow: ellipsis;
  overflow: hidden;
  padding: 0;
  width: 20px;
  height: 20px;
  pointer-events: none;
  border: none;
  background: linear-gradient(0deg, #ff512f 0%, #dd2476 100%);
  font-family: Lato;
  line-height: 14px;
  color: #ffffff;
  font-weight: bold;
  font-size: 12px;
`;

const badgeText = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const UnseenBadge: FunctionalComponent<{ clazz?: string }> = ({ clazz }, children) => {
  return (
    <div class={cx(badgeContainer, clazz)}>
      <span class={badgeText}>{children}</span>
    </div>
  );
};
