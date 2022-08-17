import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { useForm } from 'react-hook-form';
import styled from '@emotion/styled';
import { Divider, Button as MantineButton, Center } from '@mantine/core';
import { AuthContext } from '../../store/authContext';
import { api } from '../../api/api.client';
import { PasswordInput, Button, colors, Input, Text, Checkbox } from '../../design-system';
import { Github } from '../../design-system/icons';
import { API_ROOT, IS_DOCKER_HOSTED } from '../../config';
import { showNotification } from '@mantine/notifications';
import { applyToken } from '../../store/use-auth-controller';

type Props = {
  token?: string;
  email?: string;
};

export function SignUpForm({ token, email }: Props) {
  const navigate = useNavigate();
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
      const responseInvite = await acceptInvite(token);

      setToken(responseInvite);
      navigate('/templates');

      return true;
    } else {
      setToken((response as any).token);
    }

    navigate('/auth/application');

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
      accept: false,
    },
  });

  return (
    <>
      {!IS_DOCKER_HOSTED && !token && (
        <>
          <GithubButton
            my={30}
            component="a"
            href={`${API_ROOT}/v1/auth/github`}
            variant="white"
            fullWidth
            radius="md"
            leftIcon={<Github />}
            sx={{ color: colors.B40, fontSize: '16px', fontWeight: 700, height: '50px' }}
          >
            Sign Up with Github
          </GithubButton>
          <Divider label={<Text color={colors.B40}>Or</Text>} color={colors.B30} labelPosition="center" my="md" />
        </>
      )}

      <form name="login-form" onSubmit={handleSubmit(onSubmit)}>
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
          error={errors.email?.message}
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
        <Checkbox required label={<Accept />} data-test-id="accept" mt={20} />
        <Button mt={60} inherit loading={isLoading || loadingAcceptInvite} submit data-test-id="submitButton">
          Sign Up {token ? '& Accept Invite' : null}
        </Button>
        <Center mt={20}>
          <Text mr={10} size="md" color={colors.B60}>
            Already have an account?
          </Text>
          <Link to="/auth/login">
            <Text gradient> Sign In</Text>
          </Link>
        </Center>
      </form>
      {isError && (
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
    <div>
      <span>I accept the </span>
      <a style={{ textDecoration: 'underline' }} href="https://novu.co/terms">
        Terms and Conditions
      </a>
      <span> and have read the </span>
      <a style={{ textDecoration: 'underline' }} href="https://novu.co/privacy">
        Privacy Policy{' '}
      </a>
    </div>
  );
}

const GithubButton = styled(MantineButton)<{
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
