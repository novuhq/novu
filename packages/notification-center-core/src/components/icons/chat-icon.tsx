import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'chat-icon',
})
export class ChatIcon {
  @Prop() width?: string;
  @Prop() height?: string;

  render() {
    return (
      <svg width={this.width} height={this.height} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M21 1L10 12M21 1L14 21L10 12M21 1L1 8L10 12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }
}
