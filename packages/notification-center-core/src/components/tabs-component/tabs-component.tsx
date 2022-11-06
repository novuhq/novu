import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';

const tabsListWrapper = css`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 30px;
  padding: 15px;
  padding-bottom: 0;
  border-bottom: 1px solid #292933;
`;

const tabsPanelWrapper = css`
  padding-top: 10px;
`;

@Component({
  tag: 'tabs-component',
})
export class TabsComponent {
  @Prop() tabs: Element[];
  @Prop() active: string;

  render() {
    return (
      <div>
        <div class={tabsListWrapper}>{this.tabs}</div>
        <div class={tabsPanelWrapper} role="tabpanel">
          <slot />
        </div>
      </div>
    );
  }
}
