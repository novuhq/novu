import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';

import { Button, Input } from '../../../design-system';
import { api } from '../../../api/api.client';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useVercelIntegration, useVercelParams } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';

type Props = {};

export function CreateOrganization({}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  const navigate = useNavigate();
  const { setToken, token } = useAuthContext();
  const [loading, setLoading] = useState<boolean>();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();

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
        if (isFromVercel) {
          startVercelSetup();

          return;
        }
        navigate(ROUTES.HOME);
      }
    }
  }, [token, navigate, isFromVercel, startVercelSetup]);

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

    setLoading(false);
    if (isFromVercel) {
      startVercelSetup();

      return;
    }
    navigate(ROUTES.GET_STARTED);
  };

  return (
    <form noValidate name="create-app-form" onSubmit={handleSubmit(onCreateEnvironment)}>
      <Input
        error={errors.organizationName?.message}
        {...register('organizationName', {
          required: 'Please input your app name',
        })}
        required
        label="Organization Name"
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
