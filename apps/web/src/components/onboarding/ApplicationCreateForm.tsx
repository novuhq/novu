import { Button, Form, Input } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import decode from 'jwt-decode';
import { IJwtPayload } from '@notifire/shared';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';

type Props = {};

export function ApplicationCreateForm({}: Props) {
  const history = useHistory();

  const { setToken, token } = useContext(AuthContext);

  const [loading, setLoading] = useState<boolean>();
  const { mutateAsync } = useMutation<
    { _id: string },
    { error: string; message: string; statusCode: number },
    {
      name: string;
    }
  >((data) => api.post(`/v1/applications`, data));

  useEffect(() => {
    if (token) {
      const userData = decode<IJwtPayload>(token);
      if (userData.applicationId) {
        history.push('/');
      }
    }
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    const itemData = {
      name: data.applicationName,
    };

    const response = (await mutateAsync(itemData)) as any;
    const tokenResponse = await api.post(`/v1/auth/applications/${response.data._id}/switch`, data);
    setToken(tokenResponse.data.token);
    setLoading(false);
    history.push('/');
  };

  return (
    <>
      <Form layout="vertical" name="login-form" initialValues={{}} onFinish={onSubmit}>
        <Form.Item
          data-test-id="applicationName"
          name="applicationName"
          label="Application Name"
          rules={[
            {
              required: true,
              message: 'Please input application name',
            },
          ]}>
          <Input prefix={<TeamOutlined className="text-primary" />} placeholder="Amazing App" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" data-test-id="submitButton" block loading={loading}>
            CREATE
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
