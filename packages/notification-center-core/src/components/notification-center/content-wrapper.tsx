import { h } from '@stencil/core';
import { css } from '@emotion/css';

const contentWrapper = css`
  overflow: auto;
  min-height: 400px;
`;

export const ContentWrapper = (_, children) => {
  return <div class={contentWrapper}>{children}</div>;
};
