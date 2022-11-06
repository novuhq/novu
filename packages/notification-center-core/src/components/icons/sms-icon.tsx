import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'sms-icon',
})
export class SmsIcon {
  @Prop() width?: string;
  @Prop() height?: string;

  render() {
    return (
      <svg width={this.width} height={this.height} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M25 19.3333C25 19.8785 24.7659 20.4013 24.3491 20.7868C23.9324 21.1723 23.3671 21.3889 22.7778 21.3889H9.44444L5 25V9.05556C5 8.51039 5.23413 7.98755 5.65087 7.60206C6.06762 7.21657 6.63285 7 7.22222 7H22.7778C23.3671 7 23.9324 7.21657 24.3491 7.60206C24.7659 7.98755 25 8.51039 25 9.05556V19.3333Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }
}
