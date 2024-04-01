import { Button, IconLockPerson } from '@novu/design-system';
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

  const { sendVerificationEmail } = useContext(UserProfileSidebarContext);
  const { sidebarType, updateSidebarParam, token } = useUserProfileSearchParams();

  const handleSetPasswordClick: MouseEventHandler<HTMLButtonElement> = async () => {
    // don't do anything the sidebar type is already open.
    if (sidebarType) {
      return;
    }
    updateSidebarParam(UserProfileSidebarTypeEnum.PASSWORD);
    sendVerificationEmail();
  };

  const email = currentUser?.email ?? '';
  const hasPassword = currentUser?.hasPassword ?? false;

  const currentFlow = useMemo(() => selectUserProfileFlow({ token, hasPassword }), [token, hasPassword]);

  const closeSidebar = () => {
    updateSidebarParam(null);
  };

  return (
    <>
      <Button variant="outline" className={css({ color: '' })} onClick={handleSetPasswordClick}>
        <IconLockPerson className={css({ color: 'button.text.outline !important' })} />
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
