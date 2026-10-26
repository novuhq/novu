import '@/styles/home.css';

import type { Viewport } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { ExitCodes, Flags } from '@/components/home/command-reference';
import {
  AsciiRule,
  CommandLines,
  DocSection,
  FlagText,
  InlineCode,
  textWidth,
  WithPackage,
  WordFlow,
} from '@/components/home/documentation';
import { HomeArtwork } from '@/components/home/home-artwork';
import { HowItWorks } from '@/components/home/how-it-works';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import {
  HOME_AUTH,
  HOME_CONTACTS,
  HOME_CONTACTS_DESCRIPTION,
  HOME_HOSTS,
  HOME_INTRODUCTION,
  HOME_INVITE_DESCRIPTION,
  HOME_INVITES,
  HOME_LINKS,
  HOME_SETUP,
  HOME_SETUP_DESCRIPTION,
  HOME_USAGE,
  INSTALL_COMMAND,
} from '@/data/home';
import { pageMetadata } from '@/lib/seo';

const semibold = localFont({
  src: '../../public/fonts/geist-mono-semibold.woff2',
  weight: '600',
  style: 'normal',
  variable: '--font-home-semibold',
  display: 'swap',
});

const regular = localFont({
  src: '../../public/fonts/geist-mono-regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-home-regular',
  display: 'swap',
  declarations: [
    { prop: 'ascent-override', value: '98.25%' },
    { prop: 'descent-override', value: '15.75%' },
    { prop: 'line-gap-override', value: '10%' },
  ],
});

export const metadata = pageMetadata('home');

export const viewport: Viewport = {
  themeColor: '#fbfbfb',
};

/**
 * agentinbox.md for agents ("for robots"): the CLI on one page of light paper, with `/index.md` as its
 * Markdown. People go on to `/sapien`; an agent connected from the dashboard reads `/agents.md`, and each
 * host has its own page of steps (`/claude-code`), linked under HOSTS.
 */
export default function HomePage() {
  return (
    <div className={`home-page ${semibold.variable} ${regular.variable}`}>
      <SiteStructuredData page="home" />
      <HomeArtwork />
      <main className="home-document">
        <header className="home-introduction">
          <div className="home-human-banner">
            <AsciiRule />
            <p>
              <span aria-hidden="true" className="home-banner-pipe">
                |
              </span>
              <span>
                Human? Visit <Link href="/sapien">agentinbox.md/sapien</Link> for the human-readable version.
              </span>
              <span aria-hidden="true" className="home-banner-pipe">
                |
              </span>
            </p>
            <AsciiRule />
          </div>
          <h1>
            agentinbox.md
            <br />
            The inbox API for agents
          </h1>
          <p className="home-description">
            {HOME_INTRODUCTION[0]}
            <br />
            <WithPackage text={HOME_INTRODUCTION[1]} />
          </p>
          <AsciiRule />
        </header>

        <DocSection anchor="install" title="INSTALL">
          <CommandLines commands={[INSTALL_COMMAND]} />
        </DocSection>
        <DocSection anchor="setup" title="SETUP" subtitle="once, by you or by your agent">
          <p>
            <FlagText text={HOME_SETUP_DESCRIPTION} />
          </p>
          <CommandLines commands={HOME_SETUP} />
        </DocSection>
        <DocSection anchor="hosts" title="HOSTS" subtitle="step by step, wherever your agent runs">
          <nav aria-label="Setup for each host" className="home-links">
            {HOME_HOSTS.map((item, index) => (
              <span key={item.label}>
                {index > 0 ? (
                  <span aria-hidden="true" className="home-link-divider">
                    |
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  title={`Agent Inbox for ${item.name}`}
                  style={{ minWidth: textWidth(item.label) }}
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </DocSection>
        <DocSection anchor="usage" title="USAGE" subtitle="forever after, by any agent on the machine">
          <CommandLines commands={HOME_USAGE} />
        </DocSection>
        <DocSection anchor="how-it-works" title="HOW IT WORKS">
          <HowItWorks />
        </DocSection>
        <DocSection anchor="exit-codes" title="EXIT CODES" subtitle="stable contract for agents">
          <ExitCodes />
        </DocSection>
        <DocSection anchor="flags" title="FLAGS">
          <Flags />
        </DocSection>
        <DocSection anchor="invite" title="INVITE" subtitle="link another human">
          <p>
            <FlagText text={HOME_INVITE_DESCRIPTION} />
          </p>
          <CommandLines commands={HOME_INVITES} fenced />
        </DocSection>
        <DocSection anchor="contacts" title="CONTACTS" subtitle="who agents can reach">
          <p>
            <FlagText text={HOME_CONTACTS_DESCRIPTION} />
          </p>
          <CommandLines commands={HOME_CONTACTS} fenced />
        </DocSection>
        <DocSection anchor="auth" title="AUTH">
          <WordFlow className="home-auth-description">
            <InlineCode>{`\`${HOME_AUTH.commands[0]}\`,`}</InlineCode>{' '}
            <InlineCode>{`\`${HOME_AUTH.commands[1]}\``}</InlineCode> and{' '}
            <InlineCode>{`\`${HOME_AUTH.commands[2]}\``}</InlineCode> store credentials in{' '}
            <InlineCode>{`${HOME_AUTH.file}.`}</InlineCode> {HOME_AUTH.alternative}
          </WordFlow>
        </DocSection>
        <DocSection anchor="links" title="LINKS">
          <nav aria-label="Documentation links" className="home-links">
            {HOME_LINKS.map((item, index) => (
              <span key={item.label}>
                {index > 0 ? (
                  <span aria-hidden="true" className="home-link-divider">
                    |
                  </span>
                ) : null}
                {/* A page of this site goes client-side; `/agents.md` is a file, so it's an ordinary link. */}
                {item.href.startsWith('/') && !item.href.endsWith('.md') ? (
                  <Link href={item.href} style={{ minWidth: textWidth(item.label) }}>
                    {item.label}
                  </Link>
                ) : (
                  <a href={item.href} style={{ minWidth: textWidth(item.label) }}>
                    {item.label}
                  </a>
                )}
              </span>
            ))}
          </nav>
        </DocSection>
        <footer className="home-comment">
          built by <a href="https://novu.co/">novu</a>
        </footer>
      </main>
    </div>
  );
}
