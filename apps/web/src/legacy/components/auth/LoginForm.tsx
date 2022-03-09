import { Button, Form, Input, Divider, Alert } from 'antd';
import Icon, { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { useMutation } from 'react-query';
import * as Sentry from '@sentry/react';
import { AuthContext } from '../../../store/authContext';
import { api } from '../../../api/api.client';

type Props = {};

export function LoginForm({}: Props) {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      email: string;
      password: string;
    }
  >((data) => api.post(`/v1/auth/login`, data));

  const onLogin = async (data) => {
    const itemData = {
      email: data.email,
      password: data.password,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken((response as any).token);
      navigate('/templates');
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  return (
    <>
      <Form layout="vertical" name="login-form" initialValues={{}} onFinish={onLogin}>
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
          <Input prefix={<MailOutlined className="text-primary" />} />
        </Form.Item>
        <Form.Item
          data-test-id="password"
          name="password"
          label={
            <div className="d-flex justify-content-between w-100 align-items-center">
              <span>Password </span>
              <Link to="/auth/reset/request">
                <span className="cursor-pointer font-size-sm font-weight-normal text-muted ml-1">Forget Password?</span>
              </Link>
            </div>
          }
          rules={[
            {
              required: true,
              message: 'Please input your password',
            },
          ]}>
          <Input.Password prefix={<LockOutlined className="text-primary" />} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={isLoading} data-test-id="submit-btn">
            Sign In
          </Button>
        </Form.Item>
        {/*       <div>
          <Divider>
            <span className="text-muted font-size-base font-weight-normal">or</span>
          </Divider>
          <div className="d-flex justify-content-center">
            <Button block disabled={isLoading}>
              Connect with Google
            </Button>
          </div>
        </div> */}
      </Form>
      {isError ? (
        <Alert message={error?.message} type="error" style={{ marginTop: 20 }} data-test-id="error-alert-banner" />
      ) : null}
    </>
  );
}
