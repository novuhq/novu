import { Component, Prop, h } from '@stencil/core';

@Component({
  tag: 'email-icon',
})
export class EmailIcon {
  @Prop() width?: string;
  @Prop() height?: string;

  render() {
    return (
      <svg width={this.width} height={this.height} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M24 8.5L15 15.25L6 8.5M7 7H23C24.1 7 25 7.9 25 9V21C25 22.1 24.1 23 23 23H7C5.9 23 5 22.1 5 21V9C5 7.9 5.9 7 7 7Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }
}
