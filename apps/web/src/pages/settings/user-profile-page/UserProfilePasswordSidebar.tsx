import { IconOutlineLockPerson, Sidebar } from '@novu/design-system';
import { de } from 'date-fns/locale';
import { HStack, styled } from '../../../styled-system/jsx';
import { text, title } from '../../../styled-system/recipes';
import { selectUserProfileFlow } from './selectUserProfileFlow';
import { UserProfilePasswordEmailVerificationSection } from './UserProfilePasswordEmailVerificationSection';
import { UserProfilePasswordForm } from './UserProfilePasswordForm';
import { IUserProfilePasswordSidebarProps } from './UserProfilePasswordSidebar.shared';

// TODO: replace with design-system components in future iteration
const Title = styled('h2', title);
export const Text = styled('p', text);

export const UserProfilePasswordSidebar: React.FC<IUserProfilePasswordSidebarProps> = ({
  onClose,
  isOpened,
  email,
  countdownTimerSeconds,
  handleSendLinkEmail,
  token,
  hasPassword,
}) => {
  const currentFlow = selectUserProfileFlow({ token, hasPassword });

  const getSidebarContent = () => {
    switch (currentFlow.rootFlow) {
      case 'UPDATE_PASSWORD':
        // FIXME: Replace in update password feature
        return <div>Update password content here</div>;
      case 'SET_PASSWORD':
      default:
        switch (currentFlow.subFlow) {
          case 'CREATE_PASSWORD':
            return <UserProfilePasswordForm token={token!} />;
          case 'EMAIL_VERIFICATION':
          default:
            return (
              <UserProfilePasswordEmailVerificationSection
                email={email}
                countdownTimerSeconds={countdownTimerSeconds}
                handleSendLinkEmail={handleSendLinkEmail}
              />
            );
        }
    }
  };

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      customHeader={
        <HStack>
          <IconOutlineLockPerson />
          <Title variant={'section'}>Set password</Title>
        </HStack>
      }
    >
      {getSidebarContent()}
    </Sidebar>
  );
};
