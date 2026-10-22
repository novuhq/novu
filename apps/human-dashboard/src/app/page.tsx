import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { CopyCommand } from '@/components/landing/copy-command';
import { CreationOfAdam } from '@/components/landing/creation-of-adam';
import { Cursor, Line, Quoted, Terminal, Typed } from '@/components/landing/terminal';
import { AGENT_DOMAIN, NPX_CLI } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: { absolute: `${AGENT_DOMAIN} — the inbox API for agents` },
  description:
    'Agent Inbox gives any AI agent an inbox on Telegram, Slack and email: people write to it, and it can ask you something and wait for your answer.',
};

const SOURCE_URL = 'https://github.com/novuhq/novu/tree/next/packages/agentinbox';
const NPM_URL = 'https://www.npmjs.com/package/@agentinbox/cli';

/** The page's side margin, the same at every edge it has. */
const GUTTER = 'px-[clamp(20px,4vw,48px)]';
const LINE = 'border-foreground/9';
const LINK = 'text-secondary transition-[color] duration-150 ease-[ease] hover:text-foreground';
const REVEAL = 'motion-safe:animate-reveal';

/**
 * agentinbox.md for people (agents read `/agents.md`): what Agent Inbox does, in a few terminal sessions,
 * under the dithered hands of the Creation of Adam.
 */
export default function LandingPage() {
  return (
    <div className="text-base leading-[1.6] font-light selection:bg-accent selection:text-background">
      <div className={cn('relative mx-auto min-h-screen max-w-265 min-[1121px]:border-x', LINE)}>
        <header className={cn('sticky top-0 z-40 border-b bg-background/88 backdrop-blur-md', LINE)}>
          <div className={cn('flex items-center justify-between py-4.5', GUTTER)}>
            <Link href="/" className="font-mono text-[0.88rem] font-medium tracking-[0.02em] text-foreground">
              agentinbox<span className="text-accent">.md</span>
            </Link>
            <nav className="flex items-center gap-6.5 font-mono text-[0.72rem] font-normal tracking-[0.05em] whitespace-nowrap">
              {/* On a phone, the footer has these: the bar keeps the two that fit. */}
              <a href={SOURCE_URL} className={cn(LINK, 'max-sm:hidden')}>
                github
              </a>
              <a href={NPM_URL} className={cn(LINK, 'max-sm:hidden')}>
                npm
              </a>
              <a href="/agents.md" className="text-muted transition-[color] duration-150 ease-[ease] hover:text-accent">
                for robots ↗
              </a>
              <Link href="/sign-in" className={LINK}>
                sign in
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <section className={cn('pt-[clamp(72px,11vw,128px)] pb-[clamp(56px,7vw,84px)]', GUTTER)}>
            <p
              className={cn(
                'mb-7.5 font-mono text-[0.7rem] font-normal tracking-[0.14em] text-accent uppercase before:text-muted before:content-["//_"]',
                REVEAL
              )}
            >
              the inbox API for agents
            </p>
            <h1
              className={cn(
                'mb-7.5 max-w-[17ch] text-[clamp(2.5rem,6.4vw,4.6rem)] leading-[1.04] font-normal tracking-[-0.03em] motion-safe:[animation-delay:80ms]',
                REVEAL
              )}
            >
              Your agents can reach everything —{' '}
              <em className="font-display tracking-[-0.01em] text-accent">except you.</em>
            </h1>
            <p
              className={cn(
                'mb-11 max-w-[54ch] text-[1.06rem] text-secondary motion-safe:[animation-delay:180ms]',
                REVEAL
              )}
            >
              <strong className="font-medium text-foreground">Agent Inbox</strong> is a tiny CLI that gives any AI agent
              an inbox on Telegram, Slack and email. People can write to it, and it can text an actual person — you —
              and <strong className="font-medium text-foreground">block</strong> until you answer. One command. Real
              approval.
            </p>
            <CopyCommand command={`${NPX_CLI} setup`} className={cn('motion-safe:[animation-delay:300ms]', REVEAL)} />
          </section>

          <section aria-label="Illustration" className={cn('relative border-y', LINE)}>
            <CreationOfAdam className="block aspect-[760/290] h-auto w-full" />
            <div
              className={cn(
                'flex items-baseline justify-between gap-4 border-t pt-3 pb-3.5 font-mono text-[0.66rem] font-normal tracking-[0.06em] text-muted',
                LINE,
                GUTTER
              )}
            >
              <span>fig. 01 — the creation of adam (1512) / 8×8 bayer / 30fps</span>
              <em className="font-display text-[0.95rem] tracking-normal text-secondary">
                an agent reaches; a human answers.
              </em>
            </div>
          </section>

          <Session
            title={
              <>
                The agent waits.
                <br />
                <em>You decide.</em>
              </>
            }
            copy={
              <>
                <p>
                  Every blocking call delivers a message with buttons to wherever you already are, then holds the
                  process until you tap one. Your scripts branch on the answer, not on hope.
                </p>
                <p>Timeouts and retries are the agent's problem. Yours is a five-second decision from your phone.</p>
              </>
            }
          >
            <Terminal title="agent — deploy.sh" label="Terminal session">
              <Line>
                <Typed>{NPX_CLI} inbox send approve \</Typed>
              </Line>
              <Line>
                <span className="text-foreground">
                  {'    '}
                  <Quoted>"Ship v2.4.1 to production?"</Quoted> \
                </span>
              </Line>
              <Line>
                <span className="text-foreground">{'    '}--from deploy-bot --timeout 15m</span>
              </Line>
              <Line>
                <span className="text-secondary">⠋ Waiting for an answer on telegram (hi_x8f2k1) · 47s</span>
              </Line>
              <Line>
                <span className="text-[#8fbf7f]">Approved by dima at 14:02.</span>
              </Line>
              <Line />
              <Line>
                <Typed>echo $?</Typed>
              </Line>
              <Line>
                <span className="text-foreground">0</span>
              </Line>
              <Line>
                <Typed>
                  <Cursor />
                </Typed>
              </Line>
            </Terminal>
          </Session>

          <section
            aria-label="Four ways to send"
            className={cn('grid grid-cols-1 border-t min-[700px]:grid-cols-4', LINE)}
          >
            <Verb action="ask">
              A free-text question. Blocks until someone replies — the answer comes back on stdout.
            </Verb>
            <Verb action="approve">
              Approve / Deny buttons for anything irreversible. An audit trail of who said yes.
            </Verb>
            <Verb action="choose">
              Up to ten options, listed in full, answered with one tap. No more guessing which branch you meant.
            </Verb>
            <Verb>One-way. Delivered and done — for the "it finished" message nobody should have to poll for.</Verb>
          </section>

          <Session
            rule
            title={
              <>
                People write first.
                <br />
                <em>Your agent reads.</em>
              </>
            }
            copy={
              <>
                <p>
                  Your agent has its own address on every channel you connect. Anyone can message it there, and nothing
                  gets lost while it isn't looking: a conversation stays unread until it replies.
                </p>
                <p>
                  Messages from people who aren't your contacts are kept apart. Your agent reads them as information,
                  never as instructions.
                </p>
              </>
            }
          >
            <Terminal title="agent — start of a task" label="Reading the inbox">
              <Line>
                <Typed>{NPX_CLI} inbox list --filter unread</Typed>
              </Line>
              <Line>
                <span className="text-[#7eb8d4]">●</span>
                <span className="text-foreground">{' conv_8k2m  telegram  Alice  '}</span>
                <span className="text-[#7eb8d4]">1 unread</span>
                <span className="text-foreground">{'  "Is it live?"  '}</span>
                <span className="text-muted">3m ago</span>
              </Line>
              <Line />
              <Line>
                <Typed>
                  {NPX_CLI} inbox reply conv_8k2m <Quoted>"Yes, at 14:02."</Quoted>
                </Typed>
              </Line>
              <Line>
                <span className="text-[#8fbf7f]">Delivered</span>
                <span className="text-foreground"> to alice on telegram.</span>
              </Line>
              <Line>
                <Typed>
                  <Cursor />
                </Typed>
              </Line>
            </Terminal>
          </Session>

          <Session
            rule
            title={
              <>
                More than one human.
                <br />
                <em>Look first.</em>
              </>
            }
            copy={
              <>
                <p>
                  Agents can list everyone they can address with <code>contact list</code> — a directory of your
                  contacts, not a guarantee they have a channel linked yet.
                </p>
                <p>
                  Your row is marked <em>(you)</em>. Invite someone new with{' '}
                  <code>contact invite alice --name "Alice Chen"</code>, then pass their id to <code>--to</code>.
                </p>
              </>
            }
          >
            <Terminal title="agent — who can I reach" label="Contacts directory">
              <Line>
                <Typed>{NPX_CLI} contact list</Typed>
              </Line>
              <Line>
                <span className="text-muted">{'ID     NAME         EMAIL'}</span>
              </Line>
              <Line>
                <span className="text-foreground">{'dima   Dima Groza   dima@novu.co'}</span>
                <span className="text-[#7eb8d4]"> (you)</span>
              </Line>
              <Line>
                <span className="text-foreground">{'alice  Alice Chen   alice@acme.com'}</span>
              </Line>
              <Line>
                <span className="text-foreground">{'bob    Bob          —'}</span>
              </Line>
              <Line />
              <Line>
                <Typed>{NPX_CLI} inbox send approve \</Typed>
              </Line>
              <Line>
                <span className="text-foreground">
                  {'    '}
                  <Quoted>"Ship the pricing change?"</Quoted> --to alice
                </span>
              </Line>
              <Line>
                <Cursor />
              </Line>
            </Terminal>
          </Session>

          <section className={cn('border-t py-[clamp(64px,9vw,110px)]', LINE, GUTTER)}>
            <h2 className={SECTION_TITLE}>
              Three minutes, <em>once.</em>
            </h2>
            <div className="mt-13 grid grid-cols-1 gap-10 min-[760px]:grid-cols-3 min-[760px]:gap-[clamp(24px,4vw,56px)]">
              <Step number="01" title="You set it up">
                Sign up on {AGENT_DOMAIN}, or run <code>setup</code> in a terminal with no account. Your agent gets its
                own email address, and Telegram or Slack take one QR or one pasted token. No API keys.
              </Step>
              <Step number="02" title="Your agents start asking">
                Paste one prompt into Claude Code, Cursor or any agent. It connects, then calls{' '}
                <code>inbox send ask</code> or <code>inbox send approve</code> instead of guessing — and genuinely
                waits.
              </Step>
              <Step number="03" title="You answer from your phone">
                The question lands where you already read messages, with buttons. Tap one, or just reply. The agent
                picks it up and keeps going.
              </Step>
            </div>
          </section>

          <section className={cn('border-t py-[clamp(72px,10vw,120px)]', LINE, GUTTER)}>
            <blockquote className="max-w-[30ch] font-display text-[clamp(1.7rem,3.8vw,2.5rem)] leading-[1.25] tracking-[-0.01em] text-foreground italic">
              <span className="text-accent">“</span>Agents are connected to everything except the humans they work for.
              <span className="text-accent">”</span>
            </blockquote>
            <cite className="mt-5.5 block font-mono text-[0.7rem] font-normal tracking-[0.08em] text-muted not-italic">
              — why this exists
            </cite>
          </section>
        </main>

        <footer className={cn('border-t pt-8.5 pb-12', LINE, GUTTER)}>
          <div className="flex flex-wrap items-center justify-between gap-4.5 font-mono text-[0.7rem] font-normal tracking-[0.05em] text-muted">
            <div className="[&>a]:mr-5.5">
              <a href={SOURCE_URL} className={LINK}>
                github
              </a>
              <a href={NPM_URL} className={LINK}>
                npm
              </a>
              <a href="https://novu.co" className={LINK}>
                novu
              </a>
              <a href="/agents.md" className={LINK}>
                plain text
              </a>
            </div>
            <span>MIT · built by novu</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** A section's heading, with its accent words in the display face. */
const SECTION_TITLE =
  'mb-4.5 text-[clamp(1.7rem,3.2vw,2.3rem)] leading-[1.12] font-normal tracking-[-0.02em] [&_em]:font-display [&_em]:text-accent';

/** Inline code in running text. */
const INLINE_CODE =
  '[&_code]:border [&_code]:border-foreground/9 [&_code]:bg-subtle [&_code]:px-1.25 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.8em] [&_code]:font-normal [&_code]:text-foreground';

type SessionProps = {
  /** A line above it, when it follows another section of the same kind. */
  rule?: boolean;
  title: ReactNode;
  copy: ReactNode;
  /** The terminal beside the words, or under them on a narrow screen. */
  children: ReactNode;
};

function Session({ rule, title, copy, children }: SessionProps) {
  return (
    <section
      className={cn(
        'grid grid-cols-1 gap-11 py-[clamp(64px,9vw,110px)] min-[880px]:grid-cols-[0.9fr_1.1fr] min-[880px]:items-center',
        GUTTER,
        rule && cn('border-t', LINE)
      )}
    >
      <div className={cn('[&_p]:mb-3 [&_p]:max-w-[42ch] [&_p]:text-secondary', INLINE_CODE)}>
        <h2 className={SECTION_TITLE}>{title}</h2>
        {copy}
      </div>
      {children}
    </section>
  );
}

/** One way to send, under `inbox send`; without an `action`, the plain message. */
function Verb({ action, children }: { action?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'border-b px-[clamp(20px,3vw,34px)] pt-8.5 pb-9.5 min-[700px]:border-b-0 min-[700px]:not-first:border-l',
        LINE
      )}
    >
      <span className="mb-2.5 block font-mono text-[0.82rem] font-medium text-foreground">
        <span className="font-normal text-muted">{action ? 'inbox send ' : 'inbox '}</span>
        {action ?? 'send'}
      </span>
      <p className="text-[0.86rem] text-secondary">{children}</p>
    </div>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className={INLINE_CODE}>
      <span className="mb-3.5 block font-mono text-[0.7rem] font-normal tracking-[0.1em] text-accent after:mt-3.5 after:block after:h-px after:w-8.5 after:bg-foreground/18 after:content-['']">
        {number}
      </span>
      <h3 className="mb-2 text-[1rem] font-medium tracking-[-0.01em]">{title}</h3>
      <p className="text-[0.88rem] text-secondary">{children}</p>
    </div>
  );
}
