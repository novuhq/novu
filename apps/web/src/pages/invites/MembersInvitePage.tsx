import { Form } from 'antd';
import { useContext, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import styled from 'styled-components';
import { showNotification } from '@mantine/notifications';
import { Container, Group } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { MemberRoleEnum } from '@novu/shared';
import { When } from '../../components/utils/When';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import {
  changeMemberRole,
  getOrganizationMembers,
  inviteMember,
  removeMember,
  resendInviteMember,
} from '../../api/organization';
import { MembersTable } from '../../components/invites/MembersTable';
import { Button, Input, Text } from '../../design-system';
import { Invite } from '../../design-system/icons';
import { AuthContext } from '../../store/authContext';

export function MembersInvitePage() {
  const [form] = Form.useForm();
  const clipboardInviteLink = useClipboard({ timeout: 1000 });
  const [invitedMember, setInvitedMember] = useState<string>('');
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  const {
    data: members,
    isLoading: loadingMembers,
    refetch,
  } = useQuery<any[]>('getOrganizationMembers', getOrganizationMembers);

  const { isLoading: loadingSendInvite, mutateAsync: sendInvite } = useMutation<
    string,
    { error: string; message: string; statusCode: number },
    string
  >((email) => inviteMember(email));

  const { currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (!invitedMember) return;
    const currentMember = members?.find((member) => member?.invite?.email === invitedMember);
    if (!currentMember) return;

    const inviteLink = `${window.location.origin.toString()}/auth/invitation/${currentMember.invite.token}`;
    clipboardInviteLink.copy(inviteLink);

    showNotification({
      message: `Successfully copied invite link.`,
      color: 'green',
    });
  }, [members]);

  async function onSubmit({ email }) {
    if (!email) return;

    if (selfHosted) {
      setInvitedMember(email);
    }

    await sendInvite(email);
    await refetch();

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

  return (
    <PageContainer>
      <PageMeta title="Team" />
      <PageHeader
        title="Team Members"
        actions={
          <>
            <Form onFinish={onSubmit} form={form}>
              <Group align="center" spacing={10}>
                <Form.Item name="email" style={{ marginBottom: 0 }}>
                  <StyledInput required data-test-id="invite-email-field" placeholder="Invite user by email" />
                </Form.Item>
                <Button submit icon={<Invite />} loading={loadingSendInvite} data-test-id="submit-btn">
                  {selfHosted ? 'Invite By Link' : 'Invite'}
                </Button>
              </Group>
            </Form>
            <When truthy={selfHosted}>
              <StyledText> Provide copies link to the new member </StyledText>
            </When>
          </>
        }
      />

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

const StyledText = styled(Text)`
  padding-top: 10px;
`;
