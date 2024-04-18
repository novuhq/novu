import { FC } from 'react';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { css } from '../../../styled-system/css';
import { Flex, styled } from '../../../styled-system/jsx';
import { title } from '../../../styled-system/recipes';
import { InputPlain } from '../components';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { UserProfileForm } from './UserProfileForm';
import { UserProfileSidebarContextProvider } from './UserProfileSidebarContext';
import { UserProfileSidebarControl } from './UserProfileSidebarControl';

const Title = styled('h2', title);

const inputStyles = css({ minWidth: '18.75rem' });

export const UserProfilePage: FC = () => {
  const { currentUser } = useAuthContext();

  const email = currentUser?.email ?? '';

  return (
    <SettingsPageContainer title="User profile">
      <div className={css({ width: 'fit-content' })}>
        <UserProfileForm currentUser={currentUser} />
        <Title mb="100" variant="section">
          Profile security
        </Title>
        <section>
          <InputPlain
            className={inputStyles}
            type="text"
            label="Email address"
            value={email}
            autoCorrect="none"
            aria-autocomplete="none"
            autoComplete="none"
            readOnly
          />
          <div className={css({ display: 'flex', justifyContent: 'space-between' })}>
            <InputPlain
              className={inputStyles}
              type={currentUser?.hasPassword ? 'password' : 'text'}
              label="Password"
              value={currentUser?.hasPassword ? '•••••••••••••••' : 'Set a password to enhance security'}
              autoCorrect="none"
              aria-autocomplete="none"
              autoComplete="none"
              readOnly
            />
            <UserProfileSidebarContextProvider>
              <UserProfileSidebarControl />
            </UserProfileSidebarContextProvider>
          </div>
        </section>
      </div>
    </SettingsPageContainer>
  );
};
