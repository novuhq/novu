import { Alert, Button, Form, Input, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../../../store/authContext';
import { api } from '../../../api/api.client';

type Props = {
  token?: string;
  email?: string;
};

export function SignUpForm({ token, email }: Props) {
  const router = useHistory();
  const { setToken } = useContext(AuthContext);
  const { isLoading: loadingAcceptInvite, mutateAsync: acceptInvite } = useMutation<
    string,
    { error: string; message: string; statusCode: number },
    string
  >((tokenItem) => api.post(`/v1/invites/${tokenItem}/accept`, {}));

  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }
  >((data) => api.post(`/v1/auth/register`, data));

  const onSubmit = async (data) => {
    const itemData = {
      firstName: data.fullName.split(' ')[0],
      lastName: data.fullName.split(' ')[1],
      email: data.email,
      password: data.password,
      organizationName: data.organizationName,
    };

    if (!itemData.lastName) {
      return message.error('Please write your full name including last name');
    }
    const response = await mutateAsync(itemData);

    setToken((response as any).token);

    if (token) {
      const responseInvite = await acceptInvite(token);

      setToken(responseInvite);
    }

    router.push('/templates');

    return true;
  };

  return (
    <>
      {isError ? <Alert message={error?.message} type="error" /> : null}

      <Form layout="vertical" name="login-form" initialValues={{ email }} onFinish={onSubmit}>
        <Form.Item
          data-test-id="fullName"
          name="fullName"
          label="Full Name"
          rules={[
            {
              required: true,
              message: 'Please input full name',
            },
          ]}>
          <Input prefix={<UserOutlined className="text-primary" />} placeholder="Your full name goes here" />
        </Form.Item>
        <Form.Item
          data-test-id="email"
          name="email"
          label="Email"
          rules={[
            {
              required: true,
              message: 'Please input your email',
            },
            {
              type: 'email',
              message: 'Please enter a validate email!',
            },
          ]}>
          <Input
            disabled={!!email}
            prefix={<MailOutlined className="text-primary" />}
            placeholder="Work email goes here"
          />
        </Form.Item>
        <Form.Item
          data-test-id="password"
          name="password"
          label="Password"
          rules={[
            {
              required: true,
              message: 'Please input your password',
            },
            {
              min: 8,
              message: 'Minimum 8 characters',
            },
            {
              pattern: /^(?=.*\d)(?=.*[a-z])(?!.*\s).{8,}$/,
              message: 'The password must contain numbers and letters',
            },
          ]}>
          <Input.Password
            prefix={<LockOutlined className="text-primary" />}
            placeholder="Password, not your birthdate"
          />
        </Form.Item>
        {!token ? (
          <Form.Item
            data-test-id="companyName"
            name="organizationName"
            label="Company Name"
            rules={[
              {
                required: true,
                message: 'Please input company name',
              },
            ]}>
            <Input prefix={<TeamOutlined className="text-primary" />} placeholder="Mega Corp" />
          </Form.Item>
        ) : null}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            data-test-id="submitButton"
            block
            loading={isLoading || loadingAcceptInvite}>
            Sign Up {token ? 'and accept invite' : null}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
