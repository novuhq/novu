import { Button, Form, Input, Divider, Alert, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import * as Sentry from '@sentry/react';
import { api } from '../../../api/api.client';

type Props = {
  onSent: () => void;
};

export function PasswordRequestResetForm({ onSent }: Props) {
  const { isLoading, mutateAsync } = useMutation<
    { success: boolean },
    { error: string; message: string; statusCode: number },
    {
      email: string;
    }
  >((data) => api.post(`/v1/auth/reset/request`, data));

  const onForgotPassword = async (data) => {
    const itemData = {
      email: data.email,
    };

    try {
      const response = await mutateAsync(itemData);

      onSent();
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  return (
    <>
      <Form layout="vertical" name="reset-form" initialValues={{}} onFinish={onForgotPassword}>
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
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={isLoading} data-test-id="submit-btn">
            Reset Password
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
