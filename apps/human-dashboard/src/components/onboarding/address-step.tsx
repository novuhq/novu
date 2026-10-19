'use client';

import { Check } from 'lucide-react';
import { type FormEvent, useEffect, useId, useState, useTransition } from 'react';

import { checkAddressAction, createInboxAction } from '@/app/(account)/onboarding/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { StepLead, StepTitle } from '@/components/onboarding/onboarding-shell';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
  AGENT_DOMAIN,
  AGENT_NAME_MAX_LENGTH,
  addressOf,
  HANDLE_MAX_LENGTH,
  PLACEHOLDER_HANDLE,
  PLACEHOLDER_NAME,
  setupCommand,
  toHandle,
} from '@/lib/onboarding';
import { cn } from '@/lib/utils';

/** What the step shows of an agent that doesn't exist yet. The card next to it is drawn from the same. */
export type AgentDraft = {
  name: string;
  /** The address that would be created right now. Empty until a name is typed. */
  handle: string;
  /** The address asked for at first, when it was taken and `handle` is the one offered instead. */
  takenHandle?: string;
};

type AddressStepProps = {
  onDraftChange: (draft: AgentDraft) => void;
};

/** How long the operator has to stop typing before the address is checked. */
const CHECK_AFTER_MS = 250;

/** A value that takes the place of its placeholder changes color with it, rather than at once. */
const COLOR_FOLLOWS = 'transition-colors duration-200 motion-reduce:transition-none';

/** The answer for one address. `null` while it's being asked for. */
type Availability = { handle: string; available: boolean; suggestion?: string } | null;

/**
 * Step 1: the operator names the agent, and the name becomes its address. The address follows the name
 * until they edit it themselves. One that is taken is swapped for a free one close to it.
 */
export function AddressStep({ onDraftChange }: AddressStepProps) {
  const nameId = useId();
  const [name, setName] = useState('');
  // The address as the operator typed it, once they edit it. Until then it follows the name.
  const [ownHandle, setOwnHandle] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [availability, setAvailability] = useState<Availability>(null);
  const [error, setError] = useState<string>();
  const [creating, startCreating] = useTransition();

  const asked = toHandle(ownHandle ?? name);
  const answer = availability?.handle === asked ? availability : null;
  const taken = answer?.available === false;
  const handle = taken && answer.suggestion ? answer.suggestion : asked;

  useEffect(() => {
    if (!asked) {
      return;
    }

    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const check = await checkAddressAction(asked);
        if (!stale && check) {
          setAvailability(check);
        }
      } catch {
        // Not knowing is fine here: creating the inbox checks again and has the last word.
      }
    }, CHECK_AFTER_MS);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [asked]);

  useEffect(() => {
    onDraftChange({ name: name.trim(), handle, takenHandle: taken ? asked : undefined });
  }, [onDraftChange, name, handle, taken, asked]);

  function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !handle || creating) {
      return;
    }

    setError(undefined);
    startCreating(async () => {
      const result = await createInboxAction({ name: name.trim(), handle });
      if (result.ok) {
        return;
      }

      // Taken since it was last checked: the row shows it, with the address offered instead.
      if (result.check) {
        setAvailability(result.check);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <>
      <StepTitle>
        Give your agent an <em>inbox</em>
      </StepTitle>
      <StepLead>Name it once. We use it for the address and everywhere it shows up.</StepLead>

      <form onSubmit={create} className="flex flex-col gap-5.5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-xs leading-4 font-medium text-foreground">
            Name
          </label>
          <div className="flex h-13 items-center gap-3 rounded-[10px] border border-border-strong bg-subtle px-3.5 transition-colors focus-within:border-accent/80">
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={AGENT_NAME_MAX_LENGTH}
              placeholder={PLACEHOLDER_NAME}
              autoComplete="off"
              // A name for an agent is nothing a password manager has an answer for.
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              // The page has nothing else to do, so the cursor starts where the typing does.
              // biome-ignore lint/a11y/noAutofocus: the step is this one field
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-base leading-7.5 font-medium text-foreground caret-accent outline-none placeholder:font-normal placeholder:text-muted"
            />
            <span className="shrink-0 text-xs leading-4 text-muted">What people see</span>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-border">
            <div className="flex min-h-10.25 items-center gap-2.5 border-b border-border px-3.5 py-2.75">
              <RowLabel>Address</RowLabel>
              <ChannelIcon via="email" className="size-3.5 [&>svg]:size-2" />
              {editing ? (
                <input
                  value={ownHandle ?? asked}
                  onChange={(event) => setOwnHandle(toTypedHandle(event.target.value))}
                  onBlur={() => setEditing(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      setEditing(false);
                    }
                  }}
                  maxLength={HANDLE_MAX_LENGTH}
                  aria-label="Address"
                  autoComplete="off"
                  // "Address" reads like a street address to a password manager, which then offers to fill one in.
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  // biome-ignore lint/a11y/noAutofocus: it appears because Edit was pressed
                  autoFocus
                  className="w-40 min-w-0 animate-overlay-in bg-transparent font-mono text-[13px] leading-4.5 font-medium text-foreground caret-accent outline-none motion-reduce:animate-none"
                />
              ) : (
                // Without a name yet, the address is shown as it will read, in the color of a placeholder.
                <p className="flex min-w-0 animate-overlay-in font-mono text-[13px] leading-4.5 motion-reduce:animate-none">
                  <span
                    className={cn('truncate', COLOR_FOLLOWS, handle ? 'font-medium text-foreground' : 'text-muted')}
                  >
                    {handle || PLACEHOLDER_HANDLE}
                  </span>
                  <span className={cn('shrink-0 pl-0.5', COLOR_FOLLOWS, handle ? 'text-secondary' : 'text-muted')}>
                    @{AGENT_DOMAIN}
                  </span>
                </p>
              )}
              <span className="ml-auto flex shrink-0 items-center gap-2.5">
                <AvailabilityNote asked={asked} answer={answer} named={Boolean(name.trim())} />
                <button
                  type="button"
                  // Keeps the field's blur from closing it a moment before this click would.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    // Editing starts from the address on show, which may be the one offered for a taken one.
                    setOwnHandle(handle);
                    setEditing(!editing);
                  }}
                  // A name with nothing an address can hold, such as one in Cyrillic, still gets one this way.
                  disabled={!name.trim() && !handle && !editing}
                  className="rounded-sm text-xs leading-4 text-default hover:text-foreground disabled:opacity-50"
                >
                  {editing ? 'Done' : 'Edit'}
                </button>
              </span>
            </div>
            <div className="flex min-h-10 items-center gap-2.5 bg-subtle px-3.5 py-2.75">
              <RowLabel>Shows as</RowLabel>
              <p className="flex min-w-0 items-baseline gap-2.5">
                <span
                  className={cn(
                    'truncate text-[13px] leading-4.5',
                    COLOR_FOLLOWS,
                    name.trim() ? 'font-medium text-foreground' : 'text-muted'
                  )}
                >
                  {name.trim() || PLACEHOLDER_NAME}
                </span>
                <span
                  className={cn(
                    'shrink-0 font-mono text-xs leading-4',
                    COLOR_FOLLOWS,
                    handle ? 'text-secondary' : 'text-muted'
                  )}
                >
                  &lt;{addressOf(handle || PLACEHOLDER_HANDLE)}&gt;
                </span>
              </p>
              <span aria-hidden="true" className="ml-auto flex shrink-0 items-center gap-1.5">
                <ChannelIcon via="email" className="size-3.5 [&>svg]:size-2" />
                <ChannelIcon via="telegram" className="size-3.5 [&>svg]:size-2.25" />
                <ChannelIcon via="slack" className="size-3.5 [&>svg]:size-3" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            pending={creating}
            disabled={!name.trim() || !handle}
            // It lights up, and dims again, as a name is typed and cleared.
            className="transition-[background-color,color,opacity]"
          >
            Create inbox
          </Button>
          {error && (
            <p role="alert" className="animate-rise-in text-xs leading-4 text-danger motion-reduce:animate-none">
              {error}
            </p>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2.5 font-mono text-[11px] leading-3.5 text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          or from your terminal
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </p>
        <TerminalCommand command={setupCommand(name.trim() || PLACEHOLDER_NAME)} note="creates the same inbox" />
      </div>
    </>
  );
}

function RowLabel({ children }: { children: string }) {
  return (
    <span className="w-21 shrink-0 font-mono text-[10px] leading-3.5 font-medium text-muted uppercase">{children}</span>
  );
}

function AvailabilityNote({ asked, answer, named }: { asked: string; answer: Availability; named: boolean }) {
  if (!asked) {
    // The name has none of the letters an address takes: Edit, next to this, is where to type one.
    return named ? (
      <span
        key="none"
        className="animate-overlay-in font-mono text-[11px] leading-3.5 text-warning motion-reduce:animate-none"
      >
        a–z and 0–9 only
      </span>
    ) : null;
  }

  // A key each, so the answer fades in over "checking" instead of the words changing in place.
  if (!answer) {
    return (
      <span
        key="checking"
        className="animate-overlay-in font-mono text-[11px] leading-3.5 text-muted motion-reduce:animate-none"
      >
        checking…
      </span>
    );
  }

  return (
    <span
      key={answer.available ? 'free' : 'taken'}
      aria-live="polite"
      className={cn(
        'flex animate-overlay-in items-center gap-1.5 font-mono text-[11px] leading-3.5 motion-reduce:animate-none',
        answer.available ? 'text-success' : 'text-warning'
      )}
    >
      {answer.available && <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />}
      {answer.available ? 'available' : `${asked} is taken`}
    </span>
  );
}

/** One command to run in a terminal, with a button to copy it. */
function TerminalCommand({ command, note }: { command: string; note: string }) {
  return (
    <div className="flex h-10 items-center gap-2.5 rounded-lg border border-border-strong bg-subtle pr-2 pl-3.5">
      <span aria-hidden="true" className="font-mono text-[13px] leading-4.5 font-medium text-accent select-none">
        $
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] leading-4.5 text-foreground">{command}</code>
      <span className="hidden shrink-0 font-mono text-[11px] leading-3.5 text-muted sm:inline">{note}</span>
      <CopyButton value={command} label="Copy the command" className="size-6.5" iconClassName="size-3.25" />
    </div>
  );
}

/**
 * What the operator types into the address field, kept to what an address can hold. A hyphen at the
 * end stays while they type, or "atlas-" could never become "atlas-acme".
 */
function toTypedHandle(value: string): string {
  const typed = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  return typed.endsWith('-') ? `${toHandle(typed)}-`.replace(/^-+/, '') : toHandle(typed);
}
