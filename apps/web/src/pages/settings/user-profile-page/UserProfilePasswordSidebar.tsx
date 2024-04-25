import { IconOutlineLockPerson, SidebarFormless } from '@novu/design-system';
import { useContext, useEffect, useMemo } from 'react';
import { HStack, styled } from '../../../styled-system/jsx';
import { title } from '../../../styled-system/recipes';
import { UserProfilePasswordEmailVerificationSection } from './UserProfilePasswordEmailVerificationSection';
import { UserProfilePasswordForm } from './UserProfilePasswordForm';
import { IUserProfilePasswordSidebarProps } from './UserProfilePasswordSidebar.shared';
import { UserProfileSidebarContext } from './UserProfileSidebarContext';
import { UserProfileUpdatePasswordForm } from './UserProfileUpdatePasswordForm';
import { useUserProfileSearchParams } from './useUserProfileSearchParams';

// TODO: replace with design-system components in future iteration
const Title = styled('h2', title);

export const UserProfilePasswordSidebar: React.FC<IUserProfilePasswordSidebarProps> = ({
  onClose,
  isOpened,
  email,
  currentFlow,
}) => {
  const { countdownTimerSeconds, sendVerificationEmail, stopTimer } = useContext(UserProfileSidebarContext);
  const { token, clearTokenParam } = useUserProfileSearchParams();

  // ensure the timer is not running if we are in an unrelated flow
  useEffect(() => {
    if (currentFlow.rootFlow !== 'SET_PASSWORD' || currentFlow.subFlow !== 'EMAIL_VERIFICATION') {
      stopTimer();
    }
  }, [currentFlow.rootFlow, currentFlow.subFlow, stopTimer]);

  const sidebarContent = useMemo(() => {
    switch (currentFlow.rootFlow) {
      case 'UPDATE_PASSWORD':
        return <UserProfileUpdatePasswordForm />;
      case 'SET_PASSWORD':
      default:
        switch (currentFlow.subFlow) {
          case 'CREATE_PASSWORD':
            // token is already validated at this point
            return token ? <UserProfilePasswordForm token={token} onSuccess={clearTokenParam} /> : null;
          case 'EMAIL_VERIFICATION':
          default:
            return (
              <UserProfilePasswordEmailVerificationSection
                email={email}
                countdownTimerSeconds={countdownTimerSeconds}
                sendVerificationEmail={sendVerificationEmail}
              />
            );
        }
    }
  }, [
    currentFlow.rootFlow,
    currentFlow.subFlow,
    token,
    email,
    countdownTimerSeconds,
    sendVerificationEmail,
    clearTokenParam,
  ]);

  const sidebarTitle = `${currentFlow.rootFlow === 'SET_PASSWORD' ? 'Set' : 'Update'} password`;

  return (
    <SidebarFormless
      isOpened={isOpened}
      onClose={onClose}
      customHeader={
        <HStack>
          <IconOutlineLockPerson />
          <Title variant={'section'}>{sidebarTitle}</Title>
        </HStack>
      }
    >
      {sidebarContent}
    </SidebarFormless>
  );
};
