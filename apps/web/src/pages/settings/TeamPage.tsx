import { FC } from 'react';
import { MembersInvitePage } from '../invites/v2/MembersInvitePage';
import { SettingsPageContainer } from './SettingsPageContainer';

export const TeamPage: FC = () => {
  return (
    <SettingsPageContainer title={'Team members'}>
      <MembersInvitePage shouldHideTitle />
    </SettingsPageContainer>
  );
};
