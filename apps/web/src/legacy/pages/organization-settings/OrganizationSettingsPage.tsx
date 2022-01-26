import { Avatar, Button, Card, Divider, Form, Input, message, Tabs, Tag, Typography, Upload } from 'antd';
import { useMutation, useQuery } from 'react-query';
import styled from 'styled-components';
import { MemberStatusEnum } from '@notifire/shared';
import * as capitalize from 'lodash.capitalize';
import { PageHeader } from '../../components/layout/components/PageHeader';
import { getOrganizationMembers, inviteMember } from '../../../api/organization';
import { updateEmailSettings } from '../../../api/application';

export function OrganizationSettingsPage() {
  const [form] = Form.useForm();

  const { data: members, isLoading: loadingMembers, refetch } = useQuery<any[]>(
    'getOrganizationMembers',
    getOrganizationMembers
  );
  const { isLoading: loadingSendInvite, mutateAsync: sendInvite } = useMutation<
    string,
    { error: string; message: string; statusCode: number },
    string
  >((email) => inviteMember(email));

  async function onSubmit({ email }) {
    if (!email) return;

    await sendInvite(email);
    await refetch();
    form.resetFields(['email']);
  }

  return (
    <>
      <PageHeader title="Organization Settings" />

      <Card bordered title="Team members" loading={loadingMembers}>
        {members?.map((i) => {
          return (
            <>
              <MemberRowWrapper key={i._id}>
                <Avatar style={{ marginRight: 10 }} src={i.user?.profilePicture}>
                  {capitalize(i.user?.firstName[0])} {capitalize(i.user?.lastName[0])}
                </Avatar>
                {i.user
                  ? `${capitalize(i.user?.firstName as string)} ${capitalize(i.user?.lastName as string)}`
                  : i.invite.email}{' '}
                <ActionsSider>
                  <div style={{ marginLeft: 10 }}>
                    {/* eslint-disable-next-line no-nested-ternary */}
                    {i.memberStatus === MemberStatusEnum.INVITED ? (
                      <Tag color="yellow">Invite Pending</Tag>
                    ) : i.roles.find((role) => role === 'admin') ? (
                      <Tag color="geekblue">Admin</Tag>
                    ) : (
                      <Tag color="green">Member</Tag>
                    )}
                  </div>
                </ActionsSider>
              </MemberRowWrapper>
              <Divider />
            </>
          );
        })}

        <AddMemberRow>
          <Form onFinish={onSubmit} form={form}>
            <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
              <Form.Item name="email" rules={[{ required: true }]}>
                <Input
                  type="email"
                  data-test-id="invite-email-field"
                  style={{ width: 300 }}
                  placeholder="Invite user by email"
                />
              </Form.Item>
              <Button
                loading={loadingSendInvite}
                htmlType="submit"
                data-test-id="submit-btn"
                type="primary"
                style={{ marginLeft: 10 }}>
                Invite
              </Button>
            </div>
          </Form>
        </AddMemberRow>
      </Card>
    </>
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
