import { Component, Prop, h } from '@stencil/core';
import { cx, css } from '@emotion/css';

const tabStyles = css`
  height: 36px;
  width: auto;
  display: block;
  background-color: transparent;
  border: 0;
  padding: 0px;
  margin-bottom: 0;
  font-size: 14px;
  cursor: pointer;
  flex-grow: 0;

  &:after {
    content: '';
    display: block;
    height: 2px;
    background: transparent;
    border-radius: 10px;
  }
`;
const tabActiveStyles = css`
  &:after {
    background: linear-gradient(0deg, #ff512f 0%, #dd2476 100%);
  }
`;

@Component({
  tag: 'tab-component',
})
export class TabsComponent {
  @Prop() active: boolean;
  @Prop() label: Element;

  render() {
    return (
      <button
        class={cx(tabStyles, this.active ? tabActiveStyles : undefined)}
        tabIndex={this.active ? 0 : -1}
        type="button"
        role="tab"
        aria-selected={this.active ? 'true' : 'false'}
      >
        {this.label ? this.label : <slot />}
      </button>
    );
  }
}
