import { useForm } from 'react-hook-form';
import { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import decode from 'jwt-decode';
import { IJwtPayload } from '@notifire/shared';
import { Button, Input } from '../../design-system';
import { api } from '../../api/api.client';
import { AuthContext } from '../../store/authContext';

type Props = {};

export function CreateApplicationForm({}: Props) {
  const navigate = useNavigate();
  const { setToken, token } = useContext(AuthContext);
  const [loading, setLoading] = useState<boolean>();
  const { mutateAsync: createOrganization } = useMutation<
    { _id: string },
    { error: string; message: string; statusCode: number },
    {
      name: string;
    }
  >((data) => api.post(`/v1/organizations`, data));

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
        navigate('/');
      }
    }
  }, []);

  const onCreateApplication = async (data: { organizationName: string }) => {
    setLoading(true);

    const itemData = {
      name: data.organizationName,
    };

    const organization = await createOrganization(itemData);
    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});

    setToken(organizationResponseToken);

    const applicationResponse = await mutateAsync(itemData);
    const tokenResponse = await api.post(`/v1/auth/applications/${applicationResponse._id}/switch`, {});

    setToken(tokenResponse.token);
    setLoading(false);
    navigate('/');
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  return (
    <form name="create-app-form" onSubmit={handleSubmit(onCreateApplication)}>
      <Input
        error={errors.organizationName?.message}
        {...register('organizationName', {
          required: 'Please input your app name',
        })}
        required
        label="Application Name"
        placeholder="What's the name of the app?"
        data-test-id="app-creation"
        mt={5}
      />
      <Button mt={30} inherit submit data-test-id="submit-btn" loading={loading}>
        Create
      </Button>
    </form>
  );
}
