'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { HumanRegion } from '@/lib/human-accounts-api';

import { approveCliLoginAction, type CliLoginFormState } from './actions';

type CliLoginFormProps = { claim: string; region: HumanRegion };

export function CliLoginForm({ claim, region }: CliLoginFormProps) {
  const [state, formAction] = useActionState<CliLoginFormState, FormData>(approveCliLoginAction, {});

  if (state.approved) {
    return (
      <output className="block rounded-md px-3 py-2 text-[15px] tracking-tight text-foreground ring-1 ring-border">
        {state.keptSetup ? 'Your setup is now in your Human account. ' : ''}
        You&apos;re logged in. Go back to your terminal; you can close this tab.
      </output>
    );
  }

  // Once the setup can't be kept, logging in without it is the only thing left to do here.
  const keepSetup = Boolean(claim) && !state.canSkipClaim;

  return (
    <form action={formAction} className="flex flex-col items-start gap-4">
      <input type="hidden" name="claim" value={claim} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="keepSetup" value={keepSetup ? 'yes' : 'no'} />
      <label className="flex flex-col gap-2">
        <span className="font-mono text-sm tracking-tight text-foreground/50">code from your terminal</span>
        <input
          name="userCode"
          defaultValue={state.userCode}
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          placeholder="BCDF-GHJK"
          className="h-10 w-60 rounded-sm bg-black px-3 font-mono text-lg tracking-[0.2em] text-foreground uppercase ring-1 ring-border placeholder:text-foreground/25 focus:ring-accent focus:outline-none"
        />
      </label>
      <SubmitButton>{keepSetup ? 'Keep this setup and log in' : claim ? 'Log in without it' : 'Log in'}</SubmitButton>
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" pending={pending}>
      {children}
    </Button>
  );
}
