'use client';

import { useSignIn } from '@clerk/nextjs';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { authHref, ssoCallbackHref } from '@/lib/auth-redirect';

import {
  AUTH_BUTTON,
  AuthCard,
  AuthField,
  AuthInput,
  errorText,
  FormError,
  firstErrorText,
  OAuthButtons,
  type OAuthProvider,
  PasswordInput,
  QuietButton,
  SwitchForm,
  useBusy,
  useEnterApp,
} from './auth-form';

/**
 * What is on screen: the form itself, the emailed code Clerk asks for on a new device (or as a second
 * step), and the three steps of a password reset.
 */
type Step = 'credentials' | 'verify' | 'reset-email' | 'reset-code' | 'reset-password';

type Action = OAuthProvider | 'submit' | 'resend';

type SignInFormProps = {
  /** Where to go once signed in. */
  redirectPath: string;
  /** Something to say before the visitor has done anything, such as a failed return from GitHub or Google. */
  initialError?: string;
};

/**
 * Sign-in to a Human account (the Human Clerk app) with GitHub, Google, or email and password, built on
 * Clerk's `useSignIn` instead of its stock component. A forgotten password is reset with an emailed code.
 */
export function SignInForm({ redirectPath, initialError }: SignInFormProps) {
  const { signIn, errors } = useSignIn();
  const enterApp = useEnterApp(redirectPath);

  const [step, setStep] = useState<Step>('credentials');
  const [busy, setBusy] = useBusy<Action>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  /** A message of our own, for the cases Clerk reports no error for. */
  const [notice, setNotice] = useState<string | null>(initialError ?? null);

  const disabled = busy !== null;

  async function run(action: Action, request: () => Promise<void>) {
    setBusy(action);
    setNotice(null);
    try {
      await request();
    } catch {
      setNotice('Something went wrong. Check your connection and try again.');
    }
    setBusy(null);
  }

  /** Moves on from whatever Clerk says the sign-in still needs. */
  async function advance() {
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: enterApp });

      return;
    }

    if (signIn.status === 'needs_new_password') {
      setStep('reset-password');

      return;
    }

    const needsCode = signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor';
    if (needsCode && signIn.supportedSecondFactors.some((factor) => factor.strategy === 'email_code')) {
      const { error } = await signIn.mfa.sendEmailCode();
      if (!error) {
        setCode('');
        setStep('verify');
      }

      return;
    }

    setNotice(
      needsCode
        ? 'This account asks for a second step that this page cannot do yet. Sign in with GitHub or Google instead.'
        : 'Could not sign you in. Try again.'
    );
  }

  function continueWith(strategy: OAuthProvider) {
    setNotice(null);
    setBusy(strategy);
    signIn
      .sso({
        strategy,
        redirectCallbackUrl: ssoCallbackHref('/sign-in', redirectPath),
        redirectUrl: redirectPath,
      })
      // On success the browser is leaving, and the button stays busy until it has.
      .then(({ error }) => error && setBusy(null))
      .catch(() => {
        setBusy(null);
        setNotice('Could not reach that provider. Try again.');
      });
  }

  function submitCredentials(event: FormEvent) {
    event.preventDefault();
    void run('submit', async () => {
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (!error) {
        await advance();
      }
    });
  }

  function verifyCode(value: string) {
    void run('submit', async () => {
      const { error } = await signIn.mfa.verifyEmailCode({ code: value });
      if (!error) {
        await advance();
      }
    });
  }

  function sendResetCode(action: Action) {
    void run(action, async () => {
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) {
        return;
      }

      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (!error) {
        setCode('');
        setStep('reset-code');
      }
    });
  }

  function verifyResetCode(value: string) {
    void run('submit', async () => {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: value });
      if (!error) {
        await advance();
      }
    });
  }

  function submitNewPassword(event: FormEvent) {
    event.preventDefault();
    void run('submit', async () => {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (!error) {
        await advance();
      }
    });
  }

  /** Back to the form, dropping the half-done attempt and whatever Clerk said about it. */
  function startOver() {
    void signIn.reset();
    setNotice(null);
    setCode('');
    setNewPassword('');
    setStep('credentials');
  }

  const globalError = errors.global?.[0];
  const backToSignIn = (
    <QuietButton className="self-start" onClick={startOver} disabled={disabled}>
      Back to sign in
    </QuietButton>
  );

  if (step === 'verify' || step === 'reset-code') {
    const isReset = step === 'reset-code';
    const verify = isReset ? verifyResetCode : verifyCode;

    return (
      <AuthCard
        step={step}
        title="Check your email"
        description={
          <>
            Enter the code we sent to <span className="text-foreground">{email.trim()}</span>.
          </>
        }
      >
        <form
          noValidate
          className="flex flex-col gap-4.5"
          onSubmit={(event) => {
            event.preventDefault();
            verify(code);
          }}
        >
          <AuthField label={isReset ? 'Reset code' : 'Verification code'} error={errorText(errors.fields.code)}>
            {({ invalid }) => (
              <CodeInput
                value={code}
                onChange={setCode}
                onComplete={verify}
                label="Code from the email"
                invalid={invalid}
                disabled={disabled}
                autoFocus
              />
            )}
          </AuthField>
          <FormError>{firstErrorText(notice, globalError, errors.fields.identifier, errors.fields.password)}</FormError>
          <Button
            type="submit"
            className={AUTH_BUTTON}
            pending={busy === 'submit'}
            disabled={disabled || code.length < 6}
          >
            {isReset ? 'Continue' : 'Verify'}
          </Button>
        </form>
        <div className="flex items-center justify-between gap-2">
          {backToSignIn}
          <QuietButton
            disabled={disabled}
            onClick={() =>
              isReset
                ? sendResetCode('resend')
                : void run('resend', async () => {
                    await signIn.mfa.sendEmailCode();
                  })
            }
          >
            {busy === 'resend' ? 'Sending…' : 'Resend code'}
          </QuietButton>
        </div>
      </AuthCard>
    );
  }

  if (step === 'reset-email') {
    return (
      <AuthCard step={step} title="Reset your password" description="We will email you a code to set a new one.">
        <form
          noValidate
          className="flex flex-col gap-4.5"
          onSubmit={(event) => {
            event.preventDefault();
            sendResetCode('submit');
          }}
        >
          <AuthField label="Email" error={errorText(errors.fields.identifier)}>
            {(field) => (
              <AuthInput
                {...field}
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={disabled}
                autoFocus
              />
            )}
          </AuthField>
          <FormError>{firstErrorText(notice, globalError, errors.fields.password, errors.fields.code)}</FormError>
          <Button type="submit" className={AUTH_BUTTON} pending={busy === 'submit'} disabled={disabled}>
            Send code
          </Button>
        </form>
        {backToSignIn}
      </AuthCard>
    );
  }

  if (step === 'reset-password') {
    return (
      <AuthCard step={step} title="Set a new password" description="You will be signed in once it is saved.">
        <form noValidate className="flex flex-col gap-4.5" onSubmit={submitNewPassword}>
          <AuthField label="New password" error={errorText(errors.fields.password)}>
            {(field) => (
              <PasswordInput
                {...field}
                name="new-password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={disabled}
                autoFocus
              />
            )}
          </AuthField>
          <FormError>{firstErrorText(notice, globalError, errors.fields.identifier, errors.fields.code)}</FormError>
          <Button type="submit" className={AUTH_BUTTON} pending={busy === 'submit'} disabled={disabled}>
            Save and sign in
          </Button>
        </form>
        {backToSignIn}
      </AuthCard>
    );
  }

  return (
    <AuthCard step={step} title="Sign in" description="Sign in to your Human account.">
      <OAuthButtons
        pending={busy === 'oauth_github' || busy === 'oauth_google' ? busy : null}
        disabled={disabled}
        onSelect={continueWith}
      />
      <form noValidate className="flex flex-col gap-4.5" onSubmit={submitCredentials}>
        <AuthField label="Email" error={errorText(errors.fields.identifier)}>
          {(field) => (
            <AuthInput
              {...field}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={disabled}
            />
          )}
        </AuthField>
        <AuthField
          label="Password"
          error={errorText(errors.fields.password)}
          aside={
            <QuietButton
              disabled={disabled}
              onClick={() => {
                void signIn.reset();
                setNotice(null);
                setStep('reset-email');
              }}
            >
              Forgot?
            </QuietButton>
          }
        >
          {(field) => (
            <PasswordInput
              {...field}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={disabled}
            />
          )}
        </AuthField>
        <FormError>{firstErrorText(notice, globalError, errors.fields.code)}</FormError>
        <Button type="submit" className={AUTH_BUTTON} pending={busy === 'submit'} disabled={disabled}>
          Sign in
        </Button>
      </form>
      <SwitchForm question="New here?" href={authHref('/sign-up', redirectPath)}>
        Create an account
      </SwitchForm>
    </AuthCard>
  );
}
