import { Container, Group } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { MemberRoleEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';

import { Title, UserAccess } from '@novu/design-system';
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
  } = useQuery<any[]>(['getOrganizationMembers'], getOrganizationMembers);

  async function removeMemberClick(member) {
    try {
      await removeMember(member._id);

      showNotification({
        message: `Successfully deleted member .`,
        color: 'green',
      });

      refetch();
    } catch (err: any) {
      showNotification({
        message: err.message,
        color: 'red',
      });
    }
  }

  async function changeMemberRoleClick(member, memberRole: MemberRoleEnum) {
    try {
      await changeMemberRole(member._id, memberRole);

      showNotification({
        message: `Successfully changed role of member.`,
        color: 'green',
      });

      refetch();
    } catch (err: any) {
      showNotification({
        message: err.message,
        color: 'red',
      });
    }
  }

  async function resendInviteMemberClick(member) {
    if (isSelfHosted) {
      inviteByLink(member.invite.email);

      return;
    }

    try {
      await resendInviteMember(member._id);

      showNotification({
        message: `Successfully resent invite.`,
        color: 'green',
      });
    } catch (err: any) {
      showNotification({
        message: err.message,
        color: 'red',
      });
    }
  }

  const inviteByLink = (invitedEmail: string) => {
    const currentMember = members?.find((member) => member?.invite?.email === invitedEmail);
    if (!currentMember) return;

    const inviteLink = generateInviteLink(currentMember.invite.token);

    const inviteHref = buildInviteHref(currentMember, currentOrganization?.name, currentUser, inviteLink);

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

function buildInviteHref(currentMember, currentOrganization, currentUser, copyLink) {
  const mailTo = `mailto:${currentMember.invite.email}`;
  const subject = `You've been invited to ${currentOrganization}`;
  // eslint-disable-next-line max-len
  const body = `\nHi!\n\nYou have been invited to ${currentOrganization} by ${currentUser?.firstName} ${currentUser?.lastName}.\n\nClick on the link below to accept ${copyLink}.`;

  return `${mailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const generateInviteLink = (memberToken: string) => {
  return `${window.location.origin.toString()}` + parseUrl(ROUTES.AUTH_INVITATION_TOKEN, { token: memberToken });
};
