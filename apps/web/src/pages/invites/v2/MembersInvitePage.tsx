import { Container, Group } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IMemberEntity, IUserEntity, MemberRoleEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';

import { errorMessage, successMessage, Title, UserAccess } from '@novu/design-system';
import { changeMemberRole, getOrganizationMembers, removeMember, resendInviteMember } from '../../../api/organization';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { ProductLead } from '../../../components/utils/ProductLead';
import { ROUTES } from '../../../constants/routes.enum';
import { parseUrl } from '../../../utils/routeUtils';
import { MembersTable } from '../components/MembersTable';
import { CopyInviteLink } from './CopyInviteLink';
import { MemberInviteForm } from './MemberInviteForm';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';

export function MembersInvitePage() {
  const isSelfHosted = IS_DOCKER_HOSTED;
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
    if (isSelfHosted && member.invite?.email) {
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
        <Title>Team Members</Title>
        <MemberInviteForm onSuccess={refetch} inviteByLink={inviteByLink} />
      </Group>

      <Container fluid p={0}>
        <ProductLead
          icon={<UserAccess />}
          id="rbac-team-page"
          title="Role-based access control"
          text="Securely manage users' permissions to access system resources."
        />
      </Container>
      <Container fluid mt={15} p={0}>
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

function buildInviteHref({
  invitedMemberEmail,
  organizationName,
  currentUser,
  copyLink,
}: {
  invitedMemberEmail: string;
  organizationName?: string;
  currentUser?: IUserEntity;
  copyLink: string;
}) {
  const mailTo = `mailto:${invitedMemberEmail}`;
  const subject = `You've been invited to ${organizationName}`;
  // eslint-disable-next-line max-len
  const body = `\nHi!\n\nYou have been invited to ${organizationName} by ${currentUser?.firstName} ${currentUser?.lastName}.\n\nClick on the link below to accept ${copyLink}.`;

  return `${mailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const generateInviteLink = (memberToken: string) => {
  return `${window.location.origin.toString()}` + parseUrl(ROUTES.AUTH_INVITATION_TOKEN, { token: memberToken });
};
