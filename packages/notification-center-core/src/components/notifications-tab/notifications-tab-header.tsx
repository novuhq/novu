import { Component, Prop, Event, EventEmitter, h } from '@stencil/core';
import { css } from '@emotion/css';

const headerContainer = css`
  padding: 5px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 55px;
`;

@Component({
  tag: 'notifications-tab-header',
})
export class NotificationsTabHeader {
  @Event() settingsBtnClick?: EventEmitter<MouseEvent | TouchEvent>;
  @Prop() unseenCount: number;
  @Prop() hasTabs: boolean;

  settingsBtnClickHandler = (e: MouseEvent | TouchEvent) => {
    this.settingsBtnClick.emit(e);
  };

  render() {
    const showUnseenBadge = !this.hasTabs && this.unseenCount && this.unseenCount > 0;

    return (
      <div class={headerContainer}>
        <notifications-header-row showUnseenBadge={showUnseenBadge} unseenCount={this.unseenCount} />
        <settings-button onClick={this.settingsBtnClickHandler} onTouchEnd={this.settingsBtnClickHandler} />
      </div>
    );
  }
}
