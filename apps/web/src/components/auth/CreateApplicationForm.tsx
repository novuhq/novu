import { useForm } from 'react-hook-form';
import { useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { Button, Input } from '../../design-system';
import { api } from '../../api/api.client';
import { AuthContext } from '../../store/authContext';

type Props = {};

export function CreateApplication({}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  const navigate = useNavigate();
  const { setToken, token } = useContext(AuthContext);
  const [loading, setLoading] = useState<boolean>();
  const { mutateAsync: createOrganizationMutation } = useMutation<
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
  >((data) => api.post(`/v1/environments`, data));

  useEffect(() => {
    if (token) {
      const userData = decode<IJwtPayload>(token);

      if (userData.environmentId) {
        navigate('/');
      }
    }
  }, []);

  async function createEnvironment(name: string) {
    const environmentResponse = await mutateAsync({ name });
    const tokenResponse = await api.post(`/v1/auth/environments/${environmentResponse._id}/switch`, {});

    setToken(tokenResponse.token);
  }

  async function createOrganization(name: string) {
    const organization = await createOrganizationMutation({ name });
    const organizationResponseToken = await api.post(`/v1/auth/organizations/${organization._id}/switch`, {});

    setToken(organizationResponseToken);
  }

  function jwtHasKey(key: string) {
    if (!token) return false;
    const jwt = decode<IJwtPayload>(token);

    return jwt && jwt[key];
  }

  const onCreateEnvironment = async (data: { organizationName?: string }) => {
    if (!data?.organizationName) return;

    setLoading(true);

    if (!jwtHasKey('organizationId')) {
      await createOrganization(data.organizationName);
    }

    if (!jwtHasKey('environmentId')) {
      await createEnvironment(data.organizationName);
    }

    setLoading(false);
    navigate('/');
  };

  return (
    <form name="create-app-form" onSubmit={handleSubmit(onCreateEnvironment)}>
      <Input
        error={errors.organizationName?.message}
        {...register('organizationName', {
          required: 'Please input your app name',
        })}
        required
        label="Environment Name"
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
