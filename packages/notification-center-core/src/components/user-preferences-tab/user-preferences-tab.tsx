import { FunctionalComponent, h } from '@stencil/core';

import { JSX } from '../../components';
import { ContentWrapper } from '../notification-center/content-wrapper';

interface UserPreferencesTabProps {
  onBackButtonClick: JSX.UserPreferencesHeader['onBackButtonClick'];
}

export const UserPreferencesTab: FunctionalComponent<UserPreferencesTabProps> = (props) => {
  return (
    <div>
      <user-preferences-header onBackButtonClick={props.onBackButtonClick} />
      <ContentWrapper>
        <subscriber-preferences-list />
      </ContentWrapper>
    </div>
  );
};
