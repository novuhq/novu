import { FC } from 'react';
import { css } from '@novu/novui/css';
import { styled } from '@novu/novui/jsx';
import { title } from '@novu/novui/recipes';
import { useAuth } from '../../../hooks/useAuth';
import { InputPlain } from '../components';
import { SettingsPageContainer } from '../SettingsPageContainer';
import { UserProfileForm } from './UserProfileForm';
import { UserProfileSidebarContextProvider } from './UserProfileSidebarContext';
import { UserProfileSidebarControl } from './UserProfileSidebarControl';

const Title = styled('h2', title);

const inputStyles = css({ minWidth: '18.75rem' });

export const UserProfilePage: FC = () => {
  const { currentUser } = useAuth();

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
