import { Container, Group } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IMemberEntity, MemberRoleEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';

import { errorMessage, successMessage, Title, UserAccess } from '@novu/design-system';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { changeMemberRole, getOrganizationMembers, removeMember, resendInviteMember } from '../../../api/organization';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { ProductLead } from '../../../components/utils/ProductLead';
import { MembersTable } from '../components/MembersTable';
import { CopyInviteLink } from './CopyInviteLink';
import { MemberInviteForm } from './MemberInviteForm';
import { buildInviteHref, generateInviteLink } from './MembersInvitePage.utils';

interface IMembersInviteProps {
  shouldHideTitle?: boolean;
}

export function MembersInvitePage({ shouldHideTitle }: IMembersInviteProps) {
  const { currentOrganization, currentUser } = useAuthContext();

  const {
    data: members,
    isLoading: loadingMembers,
    refetch,
  } = useQuery<IMemberEntity[]>(['getOrganizationMembers'], getOrganizationMembers);

  async function removeMemberClick(member: IMemberEntity) {
    try {
      await removeMember(member._id);

      successMessage(`Successfully deleted member.`);

      refetch();
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err.message);
      }
    }
  }

  async function changeMemberRoleClick(member: IMemberEntity, memberRole: MemberRoleEnum) {
    try {
      await changeMemberRole(member._id, memberRole);
      successMessage(`Successfully changed role of member.`);

      refetch();
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err.message);
      }
    }
  }

  async function resendInviteMemberClick(member: IMemberEntity) {
    if (IS_DOCKER_HOSTED && member.invite?.email) {
      inviteByLink(member.invite.email);

      return;
    }

    try {
      await resendInviteMember(member._id);

      successMessage(`Successfully resent invite.`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err.message);
      }
    }
  }

  const inviteByLink = (invitedEmail: string) => {
    const currentMember = members?.find((member) => member?.invite?.email === invitedEmail);
    if (!currentMember || !currentMember.invite?.token) return;

    const inviteLink = generateInviteLink(currentMember.invite.token);

    const inviteHref = buildInviteHref({
      organizationName: currentOrganization?.name,
      currentUser,
      copyLink: inviteLink,
      invitedMemberEmail: invitedEmail,
    });

    showNotification({
      message: <CopyInviteLink copyLink={inviteLink} inviteEmailLink={inviteHref} />,
      color: 'green',
    });
  };

  return (
    <div>
      <Group position="apart">
        {!shouldHideTitle && <Title>Team Members</Title>}
        <MemberInviteForm onSuccess={refetch} inviteByLink={inviteByLink} />
      </Group>

      <Container fluid p={0} mt={shouldHideTitle ? 24 : undefined}>
        <ProductLead
          icon={<UserAccess />}
          id="rbac-team-page"
          title="Role-based access control"
          text="Securely manage users' permissions to access system resources."
        />
      </Container>
      <Container fluid mt={24} p={0}>
        <MembersTable
          loading={loadingMembers}
          members={members}
          currentUser={currentUser}
          onRemoveMember={removeMemberClick}
          onResendInviteMember={resendInviteMemberClick}
          onChangeMemberRole={changeMemberRoleClick}
        />
      </Container>
    </div>
  );
}
