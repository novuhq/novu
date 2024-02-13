import { Form } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { showNotification } from '@mantine/notifications';
import { Container, Group } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { MemberRoleEnum } from '@novu/shared';
import type { IResponseError } from '@novu/shared';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import {
  changeMemberRole,
  getOrganizationMembers,
  inviteMember,
  removeMember,
  resendInviteMember,
} from '../../api/organization';
import { MembersTable } from './components/MembersTable';
import { Button, Input, Invite, UserAccess } from '@novu/design-system';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { parseUrl } from '../../utils/routeUtils';
import { ROUTES } from '../../constants/routes.enum';
import { ProductLead } from '../../components/utils/ProductLead';

export function MembersInvitePage() {
  const [form] = Form.useForm();
  const clipboardInviteLink = useClipboard({ timeout: 1000 });
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { currentOrganization, currentUser } = useAuthContext();

  const {
    data: members,
    isLoading: loadingMembers,
    refetch,
  } = useQuery<any[]>(['getOrganizationMembers'], getOrganizationMembers);

  const { isLoading: loadingSendInvite, mutateAsync: sendInvite } = useMutation<string, IResponseError, string>(
    (email) => inviteMember(email)
  );

  async function onSubmit({ email }) {
    if (!email) return;

    if (selfHosted) {
      inviteByLink(email);
    }

    try {
      await sendInvite(email);
      await refetch();
    } catch (e: any) {
      if (e?.message === 'Already invited') {
        showNotification({
          message: `User with email: ${email} is already invited`,
          color: 'red',
        });
      } else throw e;
    }

    if (!selfHosted) {
      showNotification({
        message: `Invite sent to ${email}`,
        color: 'green',
      });
    }

    form.resetFields(['email']);
  }

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
    if (selfHosted) {
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

    const inviteHref = buildInviteHref(currentMember, currentOrganization?.name, currentUser, generateInviteLink);

    showNotification({
      message: getInviteMemberByLinkDiv(inviteHref, currentMember),
      color: 'green',
    });
  };

  const clipboardCopyInviteLink = (memberToken: string) => {
    clipboardInviteLink.copy(generateInviteLink(memberToken));
  };

  const generateInviteLink = (memberToken: string) => {
    return `${window.location.origin.toString()}` + parseUrl(ROUTES.AUTH_INVITATION_TOKEN, { token: memberToken });
  };

  function getInviteMemberByLinkDiv(inviteHref: string, currentMember) {
    return (
      <div>
        The invite link was successfully created. You can send it by clicking
        <a href={inviteHref} style={{ color: '#0000FF', paddingLeft: '3px' }}>
          here
        </a>
        . Or copy it directly clicking
        <StyledButton onClick={() => clipboardCopyInviteLink(currentMember.invite.token)}>here.</StyledButton>
      </div>
    );
  }

  return (
    <PageContainer title="Team">
      <PageHeader
        title="Team Members"
        actions={
          <Form noValidate onFinish={onSubmit} form={form}>
            <Group align="center" spacing={10}>
              <Form.Item name="email" style={{ marginBottom: 0 }}>
                <StyledInput required data-test-id="invite-email-field" placeholder="Invite user by email" />
              </Form.Item>
              <Button submit icon={<Invite />} loading={loadingSendInvite} data-test-id="submit-btn">
                Invite
              </Button>
            </Group>
          </Form>
        }
      />

      <Container fluid ml={5}>
        <ProductLead
          icon={<UserAccess />}
          id="rbac-team-page"
          title="Role-based access control"
          text="Securely manage users' permissions to access system resources."
        />
      </Container>
      <Container fluid mt={15} ml={5}>
        <MembersTable
          loading={loadingMembers}
          members={members}
          currentUser={currentUser}
          onRemoveMember={removeMemberClick}
          onResendInviteMember={resendInviteMemberClick}
          onChangeMemberRole={changeMemberRoleClick}
        />
      </Container>
    </PageContainer>
  );
}

function buildInviteHref(
  currentMember,
  currentOrganization,
  currentUser,
  generateInviteLink: (memberToken: string) => string
) {
  const mailTo = `mailto:${currentMember.invite.email}`;
  const subject = `You've been invited to ${currentOrganization}`;
  const body = `\nHi!\n\nYou have been invited to ${currentOrganization} by ${currentUser?.firstName} ${
    currentUser?.lastName
  }.\n\nClick on the link below to accept ${generateInviteLink(currentMember.invite.token)}.`;

  return `${mailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const StyledInput = styled(Input)`
  width: 300px;

  .mantine-TextInput-wrapper,
  input {
    min-height: auto;
    height: 42px;
  }
  position: relative;
  top: -2px;
`;

const StyledButton = styled.button`
  color: #0000ff;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
`;
