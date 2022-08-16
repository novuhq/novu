import { Form } from 'antd';
import { useMutation, useQuery } from 'react-query';
import styled from 'styled-components';
import { showNotification } from '@mantine/notifications';
import { Container, Group } from '@mantine/core';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import { getOrganizationMembers, inviteMember, removeMember, resendInviteMember } from '../../api/organization';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Input } from '../../design-system';
import { Invite } from '../../design-system/icons';
import { useContext } from 'react';
import { AuthContext } from '../../store/authContext';
import { MembersTable } from '../../components/invites/MembersTable';

export function MembersInvitePage() {
  const [form] = Form.useForm();

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

  async function onSubmit({ email }) {
    if (!email) return;

    await sendInvite(email);
    await refetch();

    showNotification({
      message: `Invite sent to ${email}`,
      color: 'green',
    });

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
          <Form onFinish={onSubmit} form={form}>
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

      <Container fluid mt={15} ml={5}>
        <MembersTable
          loading={loadingMembers}
          members={members}
          currentUser={currentUser}
          onRemoveMember={removeMemberClick}
          onResendInviteMember={resendInviteMemberClick}
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
