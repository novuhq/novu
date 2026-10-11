'use client';

import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState, useTransition } from 'react';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { Button, buttonClassName } from '@/components/ui/button';
import { CopyField } from '@/components/ui/copy-field';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import type { HumanRegion } from '@/lib/human-accounts-api';
import { cn } from '@/lib/utils';

import { approveCliLoginAction, denyCliLoginAction } from './actions';
import { normalizeUserCode } from './user-code';

/** The command that starts a login, shown wherever the person has to run it again. */
const LOGIN_COMMAND = 'human login';

/** Where "Read the quickstart" goes: the package page, whose readme is the quickstart. */
const QUICKSTART_URL = 'https://www.npmjs.com/package/@novu/human';

type CliLoginProps = {
  /** The code from the link, already checked to be a code. Empty for links from older CLIs: it's typed then. */
  userCode: string;
  /** The computer the login was started on, as its CLI reported it. Untrusted, so it's only ever rendered as text. */
  machineName?: string;
  region: HumanRegion;
  /** Claim token of a setup made without an account, when approving should move it into the account. */
  claim: string;
  /** The link asked to keep such a setup, but this account's agent is already in use. */
  cannotKeepSetup: boolean;
  email?: string;
  /** Nothing is waiting for the code in the link, so there's nothing to approve. */
  expired: boolean;
};

type View =
  | { name: 'authorize' }
  | { name: 'signed-in'; keptSetup: boolean; accountPageBehind: boolean }
  | { name: 'expired' }
  | { name: 'denied' };

/**
 * The card `human login` opens: approve or deny the login, then what happened. The code and the computer's
 * name are there to compare with the terminal; nothing is approved until Approve is pressed.
 */
export function CliLogin({ userCode, machineName, region, claim, cannotKeepSetup, email, expired }: CliLoginProps) {
  const [view, setView] = useState<View>(expired ? { name: 'expired' } : { name: 'authorize' });
  const { ref, height } = useMeasuredHeight();

  return (
    <div className="flex w-full max-w-125 flex-col items-center gap-4.5">
      <section
        // The border is part of the height; the measured content isn't.
        style={height === undefined ? undefined : { height: height + 2 }}
        className="w-full overflow-hidden rounded-[10px] border border-border bg-subtle shadow-[0_24px_64px_rgb(0_0_0/0.5)] transition-[height] duration-300 ease-out motion-reduce:transition-none"
      >
        <div ref={ref}>
          <div
            key={view.name}
            className={cn(
              'flex flex-col gap-5 p-6 sm:p-8',
              // The first card is there when the page loads; only the ones that follow it rise in.
              view.name !== (expired ? 'expired' : 'authorize') && 'animate-rise-in motion-reduce:animate-none'
            )}
          >
            {view.name === 'authorize' && (
              <Authorize
                userCode={userCode}
                machineName={machineName}
                region={region}
                claim={claim}
                cannotKeepSetup={cannotKeepSetup}
                onDone={setView}
              />
            )}
            {view.name === 'signed-in' && <SignedIn email={email} view={view} />}
            {view.name === 'expired' && (
              <Ended
                title="This login request expired"
                description="Requests last 30 minutes and work once. Start again from your terminal."
              />
            )}
            {view.name === 'denied' && (
              <Ended
                title="Login denied"
                description="Nothing was changed, and the code no longer works. If that was you after all, start again from your terminal."
              />
            )}
          </div>
        </div>
      </section>
      {!expired && (
        // Stays in the layout once the login is settled, so the card doesn't jump as this fades out.
        <p
          aria-hidden={view.name !== 'authorize'}
          className={cn(
            'text-center text-xs leading-4 text-muted transition-opacity duration-300 motion-reduce:transition-none',
            view.name !== 'authorize' && 'opacity-0'
          )}
        >
          Didn&apos;t run it? Click Deny and nothing happens.
        </p>
      )}
    </div>
  );
}

type AuthorizeProps = Pick<CliLoginProps, 'userCode' | 'machineName' | 'region' | 'claim' | 'cannotKeepSetup'> & {
  onDone: (view: View) => void;
};

function Authorize({ userCode, machineName, region, claim, cannotKeepSetup, onDone }: AuthorizeProps) {
  const [typedCode, setTypedCode] = useState('');
  const [error, setError] = useState<string>();
  // Once the setup can't be kept, approving without it is the only way to log in from here.
  const [skipClaim, setSkipClaim] = useState(false);
  const [pending, setPending] = useState<'approve' | 'deny'>();
  const [, startTransition] = useTransition();

  const keepsSetup = Boolean(claim) && !cannotKeepSetup && !skipClaim;
  const code = userCode || typedCode;

  /** Nothing waits for the code: one from the link has run its course, a typed one may just be mistyped. */
  function showNothingWaiting() {
    if (userCode) {
      onDone({ name: 'expired' });
    } else {
      setError('That code doesn’t match a login waiting in a terminal. Check it, or run human login again.');
    }
  }

  function approve() {
    if (!normalizeUserCode(code)) {
      setError('Enter the 8-letter code from your terminal, like BCDF-GHJK.');

      return;
    }

    setPending('approve');
    startTransition(async () => {
      const result = await approveCliLoginAction({ userCode: code, region, claim: keepsSetup ? claim : undefined });
      setPending(undefined);

      if (result.status === 'approved') {
        onDone({ name: 'signed-in', keptSetup: result.keptSetup, accountPageBehind: result.accountPageBehind });
      } else if (result.status === 'expired') {
        showNothingWaiting();
      } else {
        setError(result.message);
        setSkipClaim((skipped) => skipped || Boolean(result.canSkipClaim));
      }
    });
  }

  function deny() {
    setPending('deny');
    startTransition(async () => {
      const result = await denyCliLoginAction({ userCode: code, region });
      setPending(undefined);

      if (result.status === 'denied') {
        onDone({ name: 'denied' });
      } else if (result.status === 'expired') {
        // Not denied: it was already over, perhaps approved in another tab. The card must not say "denied".
        showNothingWaiting();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <>
      <p className="flex items-center gap-2">
        <TerminalIcon />
        <span className={EYEBROW}>{LOGIN_COMMAND}</span>
      </p>
      <h1 className={TITLE}>Let the human CLI act as you?</h1>
      <p className={DESCRIPTION}>
        {/* The name comes from the CLI's request, so anyone can pick it: plain text, wrapped wherever it has to. */}
        {machineName ? (
          <>
            A terminal on <span className="wrap-anywhere">{machineName}</span> started
          </>
        ) : (
          'A terminal started'
        )}{' '}
        {LOGIN_COMMAND}. Approve only if you just ran it.
      </p>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-4 py-5">
        {userCode ? (
          <>
            <p className={EYEBROW}>Code shown in your terminal</p>
            <p className="font-mono text-[15px] leading-5 font-semibold tracking-[-0.3px] text-foreground">
              {userCode}
            </p>
            <p className="text-xs leading-4 text-muted">Must match exactly</p>
          </>
        ) : (
          <>
            <label htmlFor="cli-user-code" className={EYEBROW}>
              Code shown in your terminal
            </label>
            <input
              id="cli-user-code"
              value={typedCode}
              onChange={(event) => setTypedCode(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && approve()}
              disabled={Boolean(pending)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              placeholder="BCDF-GHJK"
              className="h-7 w-40 rounded bg-transparent text-center font-mono text-[15px] leading-5 font-semibold tracking-[-0.3px] text-foreground uppercase ring-1 ring-border-strong ring-inset placeholder:font-normal placeholder:text-muted focus-visible:ring-accent focus-visible:outline-none disabled:opacity-60"
            />
            <p className="text-xs leading-4 text-muted">Type it exactly as shown</p>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {keepsSetup && (
          <Note>The setup you made without an account moves into your Human account when you approve.</Note>
        )}
        {cannotKeepSetup && (
          <Note>
            Your Human account’s agent is already in use, so the setup on your computer can’t be moved into it. You can
            still approve: the CLI then uses your account’s agent, and that setup stays behind.
          </Note>
        )}
        <Note>The CLI saves a key on this machine. Nothing to copy or paste.</Note>
      </div>
      {error && (
        <p role="alert" className="animate-rise-in text-xs leading-4 text-danger motion-reduce:animate-none">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={deny} pending={pending === 'deny'} disabled={Boolean(pending)}>
          Deny
        </Button>
        <Button onClick={approve} pending={pending === 'approve'} disabled={Boolean(pending)}>
          {skipClaim ? 'Approve without it' : 'Approve'}
        </Button>
      </div>
    </>
  );
}

function SignedIn({ email, view }: { email?: string; view: Extract<View, { name: 'signed-in' }> }) {
  return (
    <>
      <StateMark glyph="success" />
      <h1 className={TITLE}>You&apos;re signed in</h1>
      <p className={DESCRIPTION}>
        {view.keptSetup && 'Your setup is now in your Human account. '}
        Head back to your terminal. It already has the key, so you can close this tab.
        {view.accountPageBehind &&
          ' Your dashboard couldn’t be updated just now, so it may not show your setup until you log in again.'}
      </p>
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-background p-3.5 font-mono text-[13px] leading-5 text-default">
        <TerminalLine mark="$" markClassName="text-accent">
          {LOGIN_COMMAND}
        </TerminalLine>
        <TerminalLine mark="✓" markClassName="text-success">
          {email ? `Signed in as ${email}` : 'Signed in'}
        </TerminalLine>
        {/* Drawn: the mono font's subset has no arrow, and the fallback's is two letters wide. */}
        <TerminalLine
          mark={<ArrowRight aria-hidden="true" className="h-5 w-[1ch]" strokeWidth={1.5} />}
          markClassName="text-muted"
        >
          Try: human approve &quot;Ship it?&quot;
        </TerminalLine>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
          Open dashboard
        </Link>
        <a
          href={QUICKSTART_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-[13px] leading-4.5 font-medium text-secondary transition-colors duration-150 hover:bg-raised hover:text-foreground motion-reduce:transition-none"
        >
          <ArrowUpRight aria-hidden="true" className="size-3.5 text-foreground" strokeWidth={1.33} />
          Read the quickstart
        </a>
      </div>
    </>
  );
}

/** A login that can't be approved anymore: it ran out or was denied. Either way the terminal starts a new one. */
function Ended({ title, description }: { title: string; description: string }) {
  return (
    <>
      <StateMark glyph="error" />
      <h1 className={TITLE}>{title}</h1>
      <p className={DESCRIPTION}>{description}</p>
      <CopyField value={LOGIN_COMMAND} label="Copy command" command />
      <div>
        <Link href={DASHBOARD_HOME} className={buttonClassName('secondary')}>
          Go to dashboard
        </Link>
      </div>
    </>
  );
}

const EYEBROW = 'font-mono text-[11px] leading-4 font-medium tracking-[0.66px] text-muted uppercase';
const TITLE = 'text-2xl leading-7.5 tracking-[-0.48px] text-foreground';
const DESCRIPTION = 'text-[13px] leading-4.5 text-secondary';

/** The Figma illustrations `Illustration/state-success` and `Illustration/state-error`, exported as they are. */
function StateMark({ glyph }: { glyph: 'success' | 'error' }) {
  return <img src={`/illustrations/state-${glyph}.svg`} alt="" width={72} height={72} className="size-18" />;
}

/** `Icon/terminal` from the design, 16px. */
function TerminalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0 fill-foreground">
      <path d="M7.4 8 3.157 12.242l-.848-.848L5.703 8 2.309 4.606l.848-.848L7.4 8Zm0 4.2h6v1.2h-6v-1.2Z" />
    </svg>
  );
}

/** `Icon/info` from the design, 14px. */
function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" className="mt-px size-3.5 shrink-0 fill-foreground">
      <path d="M7 11.375a4.375 4.375 0 1 1 0-8.75 4.375 4.375 0 0 1 0 8.75Zm0-.875a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm.438-4.156v1.968h.437v.876h-1.75v-.876h.437V7.219h-.437v-.875h1.313Zm.218-1.094a.656.656 0 1 1-1.312 0 .656.656 0 0 1 1.312 0Z" />
    </svg>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-md border border-border px-3 py-2.5 text-xs leading-4 text-secondary">
      <InfoIcon />
      <span>{children}</span>
    </p>
  );
}

function TerminalLine({
  mark,
  markClassName,
  children,
}: {
  mark: ReactNode;
  markClassName: string;
  children: ReactNode;
}) {
  return (
    <p className="flex gap-2">
      <span aria-hidden="true" className={cn('shrink-0 font-medium select-none', markClassName)}>
        {mark}
      </span>
      <span className="min-w-0 wrap-anywhere">{children}</span>
    </p>
  );
}
