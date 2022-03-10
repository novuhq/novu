import { Button, Form, Input, Divider, Alert, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import * as Sentry from '@sentry/react';
import { useContext } from 'react';
import { AuthContext } from '../../../store/authContext';
import { api } from '../../../api/api.client';

type Props = {
  token: string;
};

export function PasswordResetForm({ token }: Props) {
  const { setToken } = useContext(AuthContext);

  const navigate = useNavigate();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      password: string;
      token: string;
    }
  >((data) => api.post(`/v1/auth/reset`, data));

  const onForgotPassword = async (data) => {
    if (data.password !== data.passwordRepeat) {
      return message.error('Passwords do not match');
    }

    const itemData = {
      password: data.password,
      token,
    };

    try {
      const response = await mutateAsync(itemData);

      setToken(response.token);
      message.success('Password was changed successfully');
      navigate('/templates');
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }

    return true;
  };

  return (
    <>
      <Form layout="vertical" name="reset-form" initialValues={{}} onFinish={onForgotPassword}>
        <Form.Item
          data-test-id="password"
          name="password"
          label={
            <div className="d-flex justify-content-between w-100 align-items-center">
              <span>Password </span>
            </div>
          }
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
          <Input.Password prefix={<LockOutlined className="text-primary" />} />
        </Form.Item>
        <Form.Item
          data-test-id="password-repeat"
          name="passwordRepeat"
          label={
            <div className="d-flex justify-content-between w-100 align-items-center">
              <span>Repeat Password</span>
            </div>
          }
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
          <Input.Password prefix={<LockOutlined className="text-primary" />} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={isLoading} data-test-id="submit-btn">
            Reset Password
          </Button>
        </Form.Item>
      </Form>
      {isError ? (
        <Alert message={error?.message} type="error" style={{ marginTop: 20 }} data-test-id="error-alert-banner" />
      ) : null}
    </>
  );
}
