'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { cn } from '@/lib/utils';

import { GitHubIcon, GoogleIcon } from './auth-icons';

/** The 40px size these screens use for inputs and buttons, on top of the shared 32px components. */
const AUTH_INPUT = 'h-10 px-3 text-sm leading-[21px] ring-border';
export const AUTH_BUTTON = 'h-10 w-full px-4 text-sm leading-[21px]';

/** Room around the form for focus rings, which the height animation would otherwise clip. */
const FOCUS_ROOM = 8;

type AuthCardProps = {
  /** Names the view inside. A new one fades in while the form moves to its height. */
  step: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
};

/**
 * The 380px column every step of sign-in and sign-up sits in. It stays centered on the screen, so its
 * height is animated: a new step or an error message moves the rest instead of making it jump.
 */
export function AuthCard({ step, title, description, children }: AuthCardProps) {
  const { ref, height } = useMeasuredHeight();

  return (
    <div
      style={height === undefined ? undefined : { height: height + FOCUS_ROOM * 2 }}
      className="-m-2 w-full max-w-99 overflow-hidden p-2 transition-[height] duration-300 ease-out motion-reduce:transition-none"
    >
      <div ref={ref}>
        <div key={step} className="flex animate-rise-in flex-col gap-4.5 motion-reduce:animate-none">
          <h1 className="text-2xl leading-7.5 tracking-[-0.48px] text-foreground">{title}</h1>
          <p className="text-[13px] leading-4.5 text-secondary">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

type AuthFieldProps = {
  label: string;
  /** Shown at the right end of the label row, such as the "Forgot?" link. */
  aside?: ReactNode;
  error?: string | null;
  children: (props: { id: string; invalid: boolean; 'aria-describedby': string | undefined }) => ReactNode;
};

/** A labelled input with the error from Clerk underneath. */
export function AuthField({ label, aside, error, children }: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] leading-4.5 font-medium text-foreground">
          {label}
        </label>
        {aside}
      </div>
      {children({ id, invalid: Boolean(error), 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="animate-rise-in text-xs leading-4 text-danger motion-reduce:animate-none"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function AuthInput({ className, ...rest }: AuthInputProps) {
  return <Input className={cn(AUTH_INPUT, className)} {...rest} />;
}

/** A password input with the eye that shows what was typed. */
export function PasswordInput({ className, disabled, ...rest }: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <AuthInput type={visible ? 'text' : 'password'} disabled={disabled} className={cn('pr-9', className)} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-sm text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none"
      >
        <Icon aria-hidden="true" strokeWidth={2.28} className="size-3.5" />
      </button>
    </div>
  );
}

/** A message about the whole form: what Clerk answered that doesn't belong to one field. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <p
      role="alert"
      className="animate-rise-in rounded bg-danger/10 px-3 py-2 text-[13px] leading-4.5 text-foreground ring-1 ring-danger-border ring-inset motion-reduce:animate-none"
    >
      {children}
    </p>
  );
}

export type OAuthProvider = 'oauth_github' | 'oauth_google';

const PROVIDERS: Array<{ strategy: OAuthProvider; label: string; icon: ReactNode }> = [
  { strategy: 'oauth_github', label: 'Continue with GitHub', icon: <GitHubIcon className="size-3.5" /> },
  { strategy: 'oauth_google', label: 'Continue with Google', icon: <GoogleIcon className="size-3.5" /> },
];

type OAuthButtonsProps = {
  /** The provider the browser is leaving for, if any. */
  pending: OAuthProvider | null;
  disabled: boolean;
  onSelect: (strategy: OAuthProvider) => void;
};

/** GitHub and Google, then the "or" line above the email form. */
export function OAuthButtons({ pending, disabled, onSelect }: OAuthButtonsProps) {
  return (
    <>
      {PROVIDERS.map(({ strategy, label, icon }) => (
        <Button
          key={strategy}
          variant="secondary"
          className={AUTH_BUTTON}
          pending={pending === strategy}
          disabled={disabled}
          onClick={() => onSelect(strategy)}
        >
          {icon}
          {label}
        </Button>
      ))}
      <div aria-hidden="true" className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[11px] leading-4 text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

/** The small mono link of these screens: "Forgot?", "Resend code", "Back to sign in". */
export function QuietButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer rounded-sm font-mono text-[11px] leading-4 text-muted transition-colors duration-150 hover:text-foreground focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:hover:text-muted motion-reduce:transition-none',
        className
      )}
      {...rest}
    />
  );
}

/** The line under the form that leads to the other one: "New here? Create an account". */
export function SwitchForm({ question, href, children }: { question: string; href: string; children: string }) {
  return (
    <p className="flex items-center gap-1 text-[13px] leading-4.5 text-secondary">
      {question}
      <Link href={href} className="rounded-sm font-medium text-accent underline-offset-4 hover:underline">
        {children}
      </Link>
    </p>
  );
}

/**
 * Which request is running, so its button can show it. Leaving for GitHub or Google keeps the form busy
 * until the browser is gone; coming back with the back button brings the page back as it was, so that
 * clears it.
 */
export function useBusy<Action extends string>() {
  const [busy, setBusy] = useState<Action | null>(null);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setBusy(null);
      }
    }

    window.addEventListener('pageshow', handlePageShow);

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return [busy, setBusy] as const;
}

/**
 * What Clerk calls to open the app once the session exists. `decorateUrl` may turn the path into a full
 * URL: Safari sometimes needs a round trip through Clerk to keep the session cookie.
 */
export function useEnterApp(redirectPath: string) {
  const router = useRouter();

  return ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
    const url = decorateUrl(redirectPath);
    if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };
}

type ClerkMessage = { message: string; longMessage?: string } | null | undefined;

/** The text of an error from Clerk, preferring the full sentence. */
export function errorText(error: ClerkMessage): string | null {
  return error ? (error.longMessage ?? error.message) : null;
}

/** The first of several possible errors, for the one message the form shows about itself. */
export function firstErrorText(...errors: Array<ClerkMessage | string>): string | null {
  for (const error of errors) {
    const text = typeof error === 'string' ? error : errorText(error);
    if (text) {
      return text;
    }
  }

  return null;
}
