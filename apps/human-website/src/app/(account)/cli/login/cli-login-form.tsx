'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { HumanRegion } from '@/lib/human-accounts-api';

import { approveCliLoginAction, type CliLoginFormState } from './actions';

type CliLoginFormProps = { code: string; claim: string; region: HumanRegion };

/** A button instead of approving on page load, so link previews and prefetching never log anyone in. */
export function CliLoginForm({ code, claim, region }: CliLoginFormProps) {
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
    <form action={formAction}>
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="claim" value={claim} />
      <input type="hidden" name="region" value={region} />
      <input type="hidden" name="keepSetup" value={keepSetup ? 'yes' : 'no'} />
      <SubmitButton>{keepSetup ? 'Keep this setup and log in' : claim ? 'Log in without it' : 'Log in'}</SubmitButton>
      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm tracking-tight text-foreground ring-1 ring-accent/40"
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
