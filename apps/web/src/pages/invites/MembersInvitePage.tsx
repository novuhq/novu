import { Form } from 'antd';
import { useMutation, useQuery } from 'react-query';
import styled from 'styled-components';
import { MemberStatusEnum } from '@novu/shared';
import { showNotification } from '@mantine/notifications';
import * as capitalize from 'lodash.capitalize';
import { Avatar, Container, Divider, Group, Text } from '@mantine/core';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import { getOrganizationMembers, inviteMember, removeMember } from '../../api/organization';
import PageContainer from '../../components/layout/components/PageContainer';
import { Button, Input, Tag } from '../../design-system';
import { Invite } from '../../design-system/icons';
import useStyles from '../../design-system/config/text.styles';

export function MembersInvitePage() {
  const [form] = Form.useForm();
  const { classes } = useStyles();

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
        message: `Successful member deletion.`,
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
        {members?.map((member) => {
          return (
            <MemberRowWrapper key={member._id}>
              <Avatar style={{ marginRight: 10, width: 40, height: 40 }} src={member.user?.profilePicture} radius="xl">
                {capitalize((member.user?.firstName || '')[0])} {capitalize((member.user?.lastName || '')[0])}
              </Avatar>
              <Group direction="column" spacing={5}>
                <Text className={classes.heading}>
                  {member.user
                    ? `${capitalize((member.user?.firstName || '') as string)} ${capitalize(
                        (member.user?.lastName || '') as string
                      )}`
                    : member.invite.email}
                </Text>
                <Text className={classes.subHeading}>{member.user?.email ? member?.user.email : null}</Text>
              </Group>
              <ActionsSider>
                <div style={{ marginLeft: 10 }}>
                  {/* eslint-disable-next-line no-nested-ternary */}
                  {member.memberStatus === MemberStatusEnum.INVITED ? (
                    <Tag>Invite Pending</Tag>
                  ) : member.roles.find((role: string) => role === 'admin') ? (
                    <Tag>Admin</Tag>
                  ) : (
                    <Tag>Member</Tag>
                  )}
                  <span onClick={() => removeMemberClick(member)}>
                    <Tag css={{ cursor: 'pointer' }}>X</Tag>
                  </span>
                </div>
              </ActionsSider>
              <Divider className={classes.seperator} />
            </MemberRowWrapper>
          );
        })}
      </Container>
    </PageContainer>
  );
}

const AddMemberRow = styled.div`
  margin-top: 30px;
`;

const ActionsSider = styled.div`
  margin-left: auto;
`;

const MemberRowWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

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
