'use client';

import { Copy, LogIn, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Button, buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import type { ConnectCodeState } from '@/hooks/use-connect-code';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import { connectCommands } from '@/lib/connect-prompt';
import type { CommandHost } from '@/lib/hosts';
import { cn } from '@/lib/utils';

type ConnectTab = 'cli';

/**
 * Only the commands, for now. The prompt that asked an agent to run them is out: an agent's own permission
 * checks (Claude Code's auto mode) stop it from saving a key and installing a skill on a pasted request, so
 * the person runs them in their terminal.
 */
const TABS: Array<{ id: ConnectTab; label: string; copy: string; copyLabel: string }> = [
  { id: 'cli', label: 'CLI', copy: 'Copy commands', copyLabel: 'Copy the commands' },
];

/** How long one view of the box takes to fade out before the next fades in. */
const SWAP_MS = 150;

/** The lines of the skeleton, as wide as the commands' lines are about: `connect` takes two. */
const SKELETON_LINES = ['96%', '40%', '56%', '52%'];

/**
 * A public host page has no account, so no code: it shows the commands with the agent and the code left
 * open, and a way to sign in where the code would be.
 */
export type SignedOutCode = { status: 'signed-out'; signInHref: string };

/** What stands in the commands for what a public page can't know. Never valid, so never mistaken for real. */
const AGENT_PLACEHOLDER = '<agent>';
const CODE_PLACEHOLDER = '<code>';

type ConnectPromptBoxProps = {
  /** The agent, as the page names it. */
  handle: string;
  /** The API the account lives on, which `connect` names. Left out on a public page. */
  apiUrl?: string;
  /** The one-time code (`useConnectCode`), or `signed-out` on a public page. */
  code: ConnectCodeState | SignedOutCode;
  onRetry?: () => void;
  /** The host the commands are for: its skills go to it alone. */
  host?: CommandHost;
};

/**
 * The box of "Connect another agent" (`Prompt` in the design): the commands the person runs in their
 * terminal, with the one-time code in them, and the button that copies them. A quiet skeleton stands in
 * while the code is on its way, and a short error with "Try again" when it couldn't be had. Whatever it
 * shows, it fades from one to the next while its height follows.
 *
 * On a public host page the code's place says "sign in to get your code" instead, and the button signs in.
 */
export function ConnectPromptBox({ handle, apiUrl, code, onRetry, host }: ConnectPromptBoxProps) {
  const [tab, setTab] = useState<ConnectTab>('cli');
  // Ties each tab to the panel it shows, for screen readers.
  const tabsId = useId();
  const signedOut = code.status === 'signed-out' ? code : null;
  const ready = code.status === 'ready' ? code.code : null;
  const details = signedOut
    ? { handle: AGENT_PLACEHOLDER, code: CODE_PLACEHOLDER }
    : { handle: ready?.handle ?? handle, code: ready?.code ?? '', apiUrl };
  const commands = connectCommands(details, host).map(({ command }) => command);
  const current = TABS.find(({ id }) => id === tab) ?? TABS[0];

  const { shown, leaving } = useSwap(ready || signedOut ? tab : code.status, SWAP_MS);
  const { ref, height } = useMeasuredHeight();

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-strong bg-subtle">
      <div className="flex items-center gap-2.5 bg-raised p-2">
        <Tabs tab={tab} onChange={setTab} idPrefix={tabsId} />
        {signedOut && (
          <Link href={signedOut.signInHref} className={buttonClassName('primary', cn(SMALL_BUTTON, 'ml-auto'))}>
            <LogIn aria-hidden="true" className="size-3.5" />
            Sign in
          </Link>
        )}
        {!signedOut &&
          (ready ? (
            <CopyButton
              value={commands.join('\n')}
              label={current.copyLabel}
              variant="primary"
              className={cn(SMALL_BUTTON, 'ml-auto')}
            >
              <Label text={current.copy} />
            </CopyButton>
          ) : (
            <Button className={cn(SMALL_BUTTON, 'ml-auto')} disabled>
              <Copy aria-hidden="true" className="size-3.5" />
              <Label text={current.copy} />
            </Button>
          ))}
      </div>

      {/* The views differ in height; the box follows while one fades into the next. */}
      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${tab}`}
        // Nothing in it takes focus, so the panel does: the keyboard reaches what it shows after the tabs.
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a tab panel without focusable content takes focus itself (WAI-ARIA tabs pattern)
        tabIndex={0}
        style={{ height }}
        className="overflow-hidden rounded-b-[10px] transition-[height] duration-300 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
      >
        <div ref={ref}>
          <div
            key={shown}
            className={cn(
              leaving
                ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
                : 'animate-overlay-in motion-reduce:animate-none'
            )}
          >
            {shown === 'loading' && <Skeleton />}
            {shown === 'error' && (
              <CodeError error={code.status === 'error' ? code.error : ''} onRetry={onRetry ?? (() => {})} />
            )}
            {shown === 'cli' && ready && (
              <div className="flex flex-col gap-3 p-4">
                <pre className="font-mono text-[12.5px] leading-5 wrap-anywhere whitespace-pre-wrap text-default">
                  <CommandLines
                    commands={commands}
                    slots={[{ text: ready.code, render: (text) => <SwappingCode code={text} /> }]}
                  />
                </pre>
                <Caption />
              </div>
            )}
            {shown === 'cli' && signedOut && (
              <div className="flex flex-col gap-3 p-4">
                <pre className="font-mono text-[12.5px] leading-5 wrap-anywhere whitespace-pre-wrap text-default">
                  <CommandLines
                    commands={commands}
                    slots={[
                      { text: AGENT_PLACEHOLDER, render: (text) => <span className="text-muted">{text}</span> },
                      {
                        text: CODE_PLACEHOLDER,
                        render: () => <SignInSlot href={signedOut.signInHref} />,
                      },
                    ]}
                  />
                </pre>
                <p className="font-mono text-[11px] leading-3.5 text-muted">
                  Sign in to fill in your agent and a code. It works once and expires in 10 min.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The button's words, which fade in anew when the tab changes them. */
function Label({ text }: { text: string }) {
  return (
    <span key={text} className="animate-overlay-in motion-reduce:animate-none">
      {text}
    </span>
  );
}

type TabsProps = {
  tab: ConnectTab;
  onChange: (tab: ConnectTab) => void;
  /** Each tab is `<idPrefix>-<tab>`, and the panel they control `<idPrefix>-panel`. */
  idPrefix: string;
};

/** Where the arrow keys, Home and End take the choice, from the tab chosen now. */
const TAB_KEYS: Record<string, (index: number) => number> = {
  ArrowRight: (index) => index + 1,
  ArrowLeft: (index) => index - 1,
  Home: () => 0,
  End: () => TABS.length - 1,
};

/**
 * The ways to connect (only the CLI for now), with the raised tile under the chosen one sliding across when
 * it changes. One stop for Tab: the arrow keys, Home and End move between them and choose as they go, as
 * tabs do.
 */
function Tabs({ tab, onChange, idPrefix }: TabsProps) {
  const buttons = useRef<Partial<Record<ConnectTab, HTMLButtonElement | null>>>({});
  const [tile, setTile] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    const button = buttons.current[tab];
    if (button) {
      setTile({ left: button.offsetLeft, width: button.offsetWidth });
    }
  }, [tab]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = TAB_KEYS[event.key];
    if (!move) {
      return;
    }

    event.preventDefault();
    const index = TABS.findIndex(({ id }) => id === tab);
    const next = TABS[(move(index) + TABS.length) % TABS.length].id;
    onChange(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="How to connect"
      onKeyDown={handleKeyDown}
      className="relative flex gap-0.5 rounded-[7px] border border-border-strong/50 bg-background p-0.5"
    >
      {tile && (
        <span
          aria-hidden="true"
          style={tile}
          className="absolute inset-y-0.5 rounded-[5px] border border-border-strong bg-raised transition-[left,width] duration-200 ease-out motion-reduce:transition-none"
        />
      )}
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          ref={(button) => {
            buttons.current[id] = button;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-${id}`}
          aria-selected={tab === id}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={tab === id ? 0 : -1}
          onClick={() => onChange(id)}
          className={cn(
            'relative rounded-[5px] border px-2.5 py-0.75 text-xs leading-4 transition-colors duration-200 ease-out motion-reduce:transition-none',
            tab === id ? 'font-medium text-foreground' : 'text-secondary hover:text-foreground',
            // Until the sliding tile has been placed, the chosen tab draws its own.
            tab === id && !tile ? 'border-border-strong bg-raised' : 'border-transparent'
          )}
        >
          {/* An unseen copy in the chosen weight keeps each tab as wide as when it is chosen, so a switch
              moves neither tab. */}
          <span className="grid justify-items-center">
            <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-medium">
              {label}
            </span>
            <span className="col-start-1 row-start-1">{label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** A stretch of a command to show differently: the code, or what a public page leaves open. */
type Slot = { text: string; render: (text: string) => ReactNode };

/** The commands as they're run, one to a line after the shell's `$`. */
function CommandLines({ commands, slots }: { commands: string[]; slots: Slot[] }) {
  return commands.map((command) => (
    <span key={command} className="block pl-[2ch] -indent-[2ch]">
      <span aria-hidden="true" className="font-medium text-accent select-none">
        ${' '}
      </span>
      <span className="font-medium text-foreground">
        <WithSlots text={command} slots={slots} />
      </span>
    </span>
  ));
}

/** A stretch of text with each slot in it drawn its own way, such as the code, which fades in where the old one was. */
function WithSlots({ text, slots }: { text: string; slots: Slot[] }): ReactNode {
  const found = slots
    .map((slot) => ({ slot, at: slot.text ? text.indexOf(slot.text) : -1 }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  if (!found) {
    return <Words text={text} />;
  }

  const { slot, at } = found;

  return (
    <>
      <Words text={text.slice(0, at)} />
      {slot.render(slot.text)}
      <WithSlots text={text.slice(at + slot.text.length)} slots={slots} />
    </>
  );
}

/**
 * Text in which a flag (`--yes`, `--api-url=…`) moves to the next line whole rather than break at its hyphens:
 * lines break between words. One longer than a whole line (`--api-url=…` on a phone) wraps inside itself, so
 * it never runs past the box's edge.
 */
function Words({ text }: { text: string }) {
  return text.split(/(\s+)/).map((word, index) =>
    word.startsWith('-') ? (
      // The words never move, so where one stands is its key. The block keeps none of the line's hanging indent.
      <span key={index} className="inline-block max-w-full indent-0 [overflow-wrap:anywhere]">
        {word}
      </span>
    ) : (
      word
    )
  );
}

function SwappingCode({ code }: { code: string }) {
  const { shown, leaving } = useSwap(code, SWAP_MS);

  return (
    <span
      key={shown}
      className={cn(
        leaving
          ? 'opacity-0 transition-opacity duration-150 ease-in motion-reduce:transition-none'
          : 'animate-overlay-in motion-reduce:animate-none'
      )}
    >
      {shown}
    </span>
  );
}

/** Where the code goes on a public page: a link to sign in, which gets it. */
function SignInSlot({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-accent underline decoration-accent/40 decoration-dashed underline-offset-4 transition-colors duration-150 hover:decoration-accent focus-visible:outline-offset-2 motion-reduce:transition-none"
    >
      sign in to get your code
    </Link>
  );
}

function Caption() {
  return <p className="font-mono text-[11px] leading-3.5 text-muted">Code works once and expires in 10 min.</p>;
}

/** Stands in for the commands while the code is on its way. */
function Skeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a loading state */}
      <div role="status" className="flex animate-pulse flex-col motion-reduce:animate-none">
        <span className="sr-only">Getting a one-time code</span>
        {SKELETON_LINES.map((width, index) => (
          // The lines never change, so where a line stands is its key.
          <span key={index} className="flex h-5 items-center">
            <span className="h-2.5 rounded-sm bg-border" style={{ width }} />
          </span>
        ))}
      </div>
      <Caption />
    </div>
  );
}

function CodeError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 p-4">
      <p className="flex items-start gap-1.5 text-[13px] leading-4.5 text-secondary">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {error}
      </p>
      <Button variant="secondary" className={SMALL_BUTTON} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
