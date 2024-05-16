import { Button, IconOutlineLockPerson } from '@novu/design-system';
import { FC, MouseEventHandler, useContext, useMemo } from 'react';
import { css } from '../../../styled-system/css';
import { UserProfileSidebarContext } from './UserProfileSidebarContext';
import { UserProfilePasswordSidebar } from './UserProfilePasswordSidebar';
import { useUserProfileSearchParams } from './useUserProfileSearchParams';
import { UserProfileSidebarTypeEnum } from './UserProfilePasswordSidebarEnum';
import { useAuthContext } from '@novu/shared-web';
import { selectUserProfileFlow } from './selectUserProfileFlow';

export const UserProfileSidebarControl: FC = () => {
  const { currentUser } = useAuthContext();
  const email = currentUser?.email ?? '';
  const hasPassword = currentUser?.hasPassword ?? false;

  const { sendVerificationEmail } = useContext(UserProfileSidebarContext);
  const { sidebarType, updateSidebarParam, token } = useUserProfileSearchParams();

  const handleSetPasswordClick: MouseEventHandler<HTMLButtonElement> = async () => {
    // don't do anything a sidebar is already open (signified by non-null sidebarType).
    if (sidebarType) {
      return;
    }

    // open the sidebar
    updateSidebarParam(UserProfileSidebarTypeEnum.PASSWORD);

    // only send verification for users who haven't previously set a password
    if (!hasPassword) {
      sendVerificationEmail();
    }
  };

  const currentFlow = useMemo(() => selectUserProfileFlow({ token, hasPassword }), [token, hasPassword]);

  const closeSidebar = () => {
    updateSidebarParam(null);
  };

  return (
    <>
      <Button variant="outline" className={css({ color: '' })} onClick={handleSetPasswordClick}>
        <IconOutlineLockPerson className={css({ color: 'button.text.outline !important' })} />
        {hasPassword ? 'Update password' : 'Set password'}
      </Button>
      <UserProfilePasswordSidebar
        isOpened={!!sidebarType}
        onClose={closeSidebar}
        currentFlow={currentFlow}
        email={email}
      />
    </>
  );
};
