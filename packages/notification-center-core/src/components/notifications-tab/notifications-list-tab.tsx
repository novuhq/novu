import { FunctionalComponent, h, getAssetPath } from '@stencil/core';
import { css } from '@emotion/css';
import { IMessage } from '@novu/shared';

import { LoaderComponent } from '../loader-component/loader-component';

const loadingHolder = css`
  text-align: center;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const NotificationsListTab: FunctionalComponent<{
  notifications?: IMessage[];
  isLoading: boolean;
}> = ({ notifications, isLoading }) => {
  if (isLoading || !notifications) {
    return <LoaderComponent />;
  }

  if (!isLoading && notifications?.length === 0) {
    return (
      <div class={loadingHolder}>
        <img
          src={getAssetPath('../../assets/no-new-notifications.png')}
          style={{ maxWidth: '200px' }}
          alt="no new notifications"
        />
      </div>
    );
  }

  // TODO: infinite scroll
  // height: 400px;
  // overflow: auto;
  return (
    <div data-test-id="notifications-scroll-area">
      {notifications.map((notification) => (
        <notifications-list-item key={notification._id} notification={notification}></notifications-list-item>
      ))}
    </div>
  );
};
