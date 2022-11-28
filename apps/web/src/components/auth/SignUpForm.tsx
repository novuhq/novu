import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { Divider, Button as MantineButton, Center } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';
import { PasswordInput, Button, colors, Input, Text, Checkbox } from '../../design-system';
import { GitHub } from '../../design-system/icons';
import { API_ROOT, IS_DOCKER_HOSTED } from '../../config';
import { applyToken } from '../../store/use-auth-controller';
import { useAcceptInvite } from './use-accept-invite.hook';
import { useVercelParams } from '../../hooks/use-vercelParams';

type Props = {
  token?: string;
  email?: string;
};

export function SignUpForm({ token, email }: Props) {
  const navigate = useNavigate();

  const { setToken } = useContext(AuthContext);
  const { isLoading: loadingAcceptInvite, submitToken } = useAcceptInvite();
  const { isFromVercel, code, next, configurationId } = useVercelParams();
  const vercelQueryParams = `code=${code}&next=${next}&configurationId=${configurationId}`;
  const loginLink = isFromVercel ? `/auth/login?${vercelQueryParams}` : '/auth/login';
  const githubLink = isFromVercel
    ? `${API_ROOT}/v1/auth/github?partnerCode=${code}&next=${next}&configurationId=${configurationId}`
    : `${API_ROOT}/v1/auth/github`;

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
    };

    if (!itemData.lastName) {
      showNotification({
        message: 'Please write your full name including last name',
        color: 'red',
      });

      return;
    }
    const response = await mutateAsync(itemData);

    /**
     * We need to call the applyToken to avoid a race condition for accept invite
     * To get the correct token when sending the request
     */
    applyToken((response as any).token);

    if (token) {
      const result = await submitToken(token);
      if (!result) return;

      navigate('/templates');

      return true;
    } else {
      setToken((response as any).token);
    }

    navigate(isFromVercel ? `/auth/application?${vercelQueryParams}` : '/auth/application');

    return true;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email,
      fullName: '',
      password: '',
    },
  });

  const [accepted, setAccepted] = useState<boolean>(false);

  const serverErrorString = useMemo<string>(() => {
    return Array.isArray(error?.message) ? error?.message[0] : error?.message;
  }, [error]);

  const emailServerError = useMemo<string>(() => {
    if (serverErrorString === 'User already exists') return 'An account with this email already exists';
    if (serverErrorString === 'email must be an email') return 'Please provide a valid email';

    return '';
  }, [serverErrorString]);

  const accountCreationError = useMemo<string>(() => {
    if (serverErrorString === 'Account creation is disabled')
      return 'The creation of new accounts is currently disabled. Please contact your administrator.';

    return '';
  }, [serverErrorString]);

  return (
    <>
      {!IS_DOCKER_HOSTED && !token && (
        <>
          <GitHubButton
            my={30}
            component="a"
            href={githubLink}
            variant="white"
            fullWidth
            radius="md"
            leftIcon={<GitHub />}
            sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px' }}
          >
            Sign Up with GitHub
          </GitHubButton>
          <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />
        </>
      )}

      <form noValidate name="login-form" onSubmit={handleSubmit(onSubmit)}>
        <Input
          error={errors.fullName?.message}
          {...register('fullName', {
            required: 'Please input full name',
          })}
          required
          data-test-id="fullName"
          label="Full Name"
          placeholder="Your full name goes here"
          mt={5}
        />
        <Input
          error={errors.email?.message || emailServerError}
          disabled={!!email}
          {...register('email', {
            required: 'Please provide an email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please provide a valid email' },
          })}
          required
          label="Email"
          placeholder="Type your email..."
          data-test-id="email"
          mt={20}
        />
        <PasswordInput
          error={errors.password?.message}
          mt={20}
          {...register('password', {
            required: 'Password, not your birthdate',
            minLength: { value: 8, message: 'Minimum 8 characters' },
            pattern: {
              value: /^(?=.*\d)(?=.*[a-z])(?!.*\s).{8,}$/,
              message: 'The password must contain numbers and letters',
            },
          })}
          required
          label="Password"
          placeholder="Type your password..."
          data-test-id="password"
        />
        <Checkbox
          onChange={(prev) => setAccepted(prev.target.checked)}
          required
          label={<Accept />}
          data-test-id="accept-cb"
          mt={20}
          mb={20}
        />

        {accountCreationError && (
          <Text mt={20} size="lg" align="center" color={colors.error}>
            {accountCreationError}
          </Text>
        )}

        <Button
          disabled={!accepted}
          mt={20}
          inherit
          loading={isLoading || loadingAcceptInvite}
          submit
          data-test-id="submitButton"
        >
          Sign Up {token ? '& Accept Invite' : null}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Already have an account?
          </Text>
          <Link to={loginLink}>
            <Text gradient> Sign In</Text>
          </Link>
        </Center>
      </form>

      {isError && !emailServerError && !accountCreationError && (
        <Text mt={20} size="lg" weight="bold" align="center" color={colors.error}>
          {' '}
          {error?.message}
        </Text>
      )}
    </>
  );
}

function Accept() {
  return (
    <>
      <span>I accept the </span>
      <a style={{ textDecoration: 'underline' }} href="https://novu.co/terms" target="_blank" rel="noopener noreferrer">
        Terms and Conditions
      </a>
      <span> and have read the </span>
      <a
        style={{ textDecoration: 'underline' }}
        href="https://novu.co/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
    </>
  );
}

const GitHubButton = styled(MantineButton)<{
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
