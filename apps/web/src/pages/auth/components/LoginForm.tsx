import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import styled from '@emotion/styled';
import { useForm } from 'react-hook-form';
import * as Sentry from '@sentry/react';
import { Divider, Button as MantineButton, Center } from '@mantine/core';

import { useAuthContext } from '../../../components/providers/AuthProvider';
import { api } from '../../../api/api.client';
import { PasswordInput, Button, colors, Input, Text } from '../../../design-system';
import { GitHub, Google } from '../../../design-system/icons';
import { IS_DOCKER_HOSTED } from '../../../config';
import { useVercelParams } from '../../../hooks';
import { useAcceptInvite } from './useAcceptInvite';
import { buildGithubLink, buildGoogleLink, buildVercelGithubLink } from './gitHubUtils';
import { ROUTES } from '../../../constants/routes.enum';
import { When } from '../../../components/utils/When';

type LoginFormProps = {
  invitationToken?: string;
  email?: string;
};

export function LoginForm({ email, invitationToken }: LoginFormProps) {
  const navigate = useNavigate();
  const { setToken } = useAuthContext();
  const { isLoading, mutateAsync, isError, error } = useMutation<
    { token: string },
    { error: string; message: string; statusCode: number },
    {
      email: string;
      password: string;
    }
  >((data) => api.post('/v1/auth/login', data));
  const { isLoading: isLoadingAcceptInvite, submitToken } = useAcceptInvite();

  const { isFromVercel, code, next, configurationId } = useVercelParams();
  const vercelQueryParams = `code=${code}&next=${next}&configurationId=${configurationId}`;
  const signupLink = isFromVercel ? `/auth/signup?${vercelQueryParams}` : ROUTES.AUTH_SIGNUP;
  const resetPasswordLink = isFromVercel ? `/auth/reset/request?${vercelQueryParams}` : ROUTES.AUTH_RESET_REQUEST;
  const githubLink = isFromVercel
    ? buildVercelGithubLink({ code, next, configurationId })
    : buildGithubLink({ invitationToken });
  const googleLink = buildGoogleLink({ invitationToken });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: email || '',
      password: '',
    },
  });

  const onLogin = async (data) => {
    const itemData = {
      email: data.email,
      password: data.password,
    };

    try {
      const response = await mutateAsync(itemData);
      const token = (response as any).token;
      if (isFromVercel) {
        setToken(token);

        return;
      }

      if (invitationToken) {
        submitToken(token, invitationToken);

        return;
      }

      setToken(token);
      navigate(ROUTES.WORKFLOWS);
    } catch (e: any) {
      if (e.statusCode !== 400) {
        Sentry.captureException(e);
      }
    }
  };

  const serverErrorString = useMemo<string>(() => {
    return Array.isArray(error?.message) ? error?.message[0] : error?.message;
  }, [error]);

  const emailServerError = useMemo<string>(() => {
    if (serverErrorString === 'email must be an email') return 'Please provide a valid email';

    return '';
  }, [serverErrorString]);

  return (
    <>
      <When truthy={!IS_DOCKER_HOSTED}>
        <>
          <OAuth>
            <GoogleButton
              component="a"
              href={githubLink}
              my={30}
              variant="white"
              fullWidth
              radius="md"
              leftIcon={<GitHub />}
              sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px', marginRight: 10 }}
              data-test-id="github-button"
            >
              Sign In with GitHub
            </GoogleButton>
            {/*      <GoogleButton
              component="a"
              href={googleLink}
              my={30}
              variant="white"
              fullWidth
              radius="md"
              leftIcon={<Google />}
              data-test-id="google-button"
              sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px', marginLeft: 10 }}
            >
              Sign In with Google
            </GoogleButton>*/}
          </OAuth>
          <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />
        </>
      </When>
      <form noValidate onSubmit={handleSubmit(onLogin)}>
        <Input
          error={errors.email?.message || emailServerError}
          {...register('email', {
            required: 'Please provide an email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please provide a valid email' },
          })}
          required
          label="Email"
          placeholder="Type your email..."
          disabled={!!invitationToken}
          data-test-id="email"
          mt={5}
        />
        <PasswordInput
          error={errors.password?.message}
          mt={20}
          {...register('password', {
            required: 'Please input a password',
          })}
          required
          label="Password"
          placeholder="Type your password..."
          data-test-id="password"
        />

        <Link to={resetPasswordLink}>
          <Text my={30} gradient align="center">
            Forgot Your Password?
          </Text>
        </Link>

        <Button
          submit
          mt={60}
          inherit
          loading={isLoading || isLoadingAcceptInvite}
          disabled={isLoadingAcceptInvite}
          data-test-id="submit-btn"
        >
          {invitationToken ? 'Sign In & Accept' : 'Sign In'}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Don't have an account yet?
          </Text>
          <Link to={signupLink}>
            <Text gradient>Sign Up</Text>
          </Link>
        </Center>
      </form>
      {isError && !emailServerError && (
        <Text data-test-id="error-alert-banner" mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}

const OAuth = styled.div`
  display: flex;
  justify-content: space-between;
`;

const GoogleButton = styled(MantineButton)<{
  component: 'a';
  my: number;
  href: string;
  variant: 'white';
  fullWidth: boolean;
  radius: 'md';
  leftIcon: any;
  sx: any;
}>`
  :hover {
    color: ${colors.B40};
  }
`;
