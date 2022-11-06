import { Component, Prop, h } from '@stencil/core';
import { css } from '@emotion/css';

const textStyles = css`
  font-style: normal;
  align-items: center;
  text-align: left;
`;

@Component({
  tag: 'workflow-text',
})
export class WorkflowText {
  @Prop() dataTestId?: string;
  @Prop() text: string;
  @Prop() color?: string;
  @Prop() size?: 'sm' | 'lg';

  render() {
    return (
      <span
        class={textStyles}
        style={{
          color: this.color,
          fontSize: this.size === 'sm' ? '12px' : '14px',
          fontWeight: this.size === 'lg' ? '700' : '400',
          lineHeight: this.size === 'sm' ? '14.4px' : '16.8px',
        }}
        data-test-id={this.dataTestId}
      >
        {this.text}
      </span>
    );
  }
}
