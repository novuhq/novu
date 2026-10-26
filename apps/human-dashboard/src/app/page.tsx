import '@/styles/home.css';

import type { Viewport } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Fragment } from 'react';
import { Flags } from '@/components/home/command-reference';
import {
  AsciiRule,
  CommandLines,
  DocSection,
  FlagText,
  InlineCode,
  textWidth,
  WordFlow,
} from '@/components/home/documentation';
import { HomeArtwork } from '@/components/home/home-artwork';
import { HowItWorks } from '@/components/home/how-it-works';
import { InstallTabs } from '@/components/home/install-tabs';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import {
  HOME_AUTH,
  HOME_CONTACTS,
  HOME_CONTACTS_DESCRIPTION,
  HOME_HOSTS,
  HOME_INTRODUCTION,
  HOME_INVITES,
  HOME_LINKS,
  HOME_NOTES,
  HOME_QUICKSTART,
  HOME_READY,
  HOME_TRUST_AFTER,
  HOME_TRUST_BEFORE,
  HOME_USES,
  INSTALL_OPTIONS,
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
                Human? Visit <Link href="/sapien">agentinbox.md/sapien</Link> for the human version.
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
            {HOME_INTRODUCTION.map((line, index) => (
              <Fragment key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </Fragment>
            ))}
          </p>
          <AsciiRule />
        </header>

        <DocSection anchor="quickstart" title="QUICKSTART">
          <InstallTabs options={INSTALL_OPTIONS} />
          <CommandLines commands={HOME_QUICKSTART} />
        </DocSection>
        <DocSection anchor="hosts" title="HOSTS" subtitle={HOME_NOTES.hosts}>
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
        <DocSection anchor="how-it-works" title="HOW IT WORKS">
          <HowItWorks />
        </DocSection>
        <DocSection anchor="when" title="WHEN">
          <ul className="home-bullets">
            {HOME_USES.map((item) => (
              <li key={item.title}>
                <span>
                  <span className="home-use-title">{item.title}.</span> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </DocSection>
        <DocSection anchor="security" title="SECURITY">
          <ul className="home-bullets">
            {HOME_READY.map((item) => (
              <li key={item.title}>
                <span>
                  <span className="home-use-title">{item.title}.</span> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </DocSection>
        <DocSection anchor="flags" title="FLAGS">
          <Flags />
        </DocSection>
        <DocSection anchor="contacts" title="CONTACTS" subtitle={HOME_NOTES.contacts}>
          <p>
            <FlagText text={HOME_CONTACTS_DESCRIPTION} />
          </p>
          <CommandLines commands={HOME_CONTACTS} fenced />
          <div className="home-subsection">
            <h3 className="home-subsection-title">
              <span aria-hidden="true">* </span>
              INVITE
            </h3>
            <CommandLines commands={HOME_INVITES} fenced />
          </div>
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
          {HOME_TRUST_BEFORE}
          <a href="https://novu.co/">Novu</a>
          {HOME_TRUST_AFTER}
        </footer>
      </main>
    </div>
  );
}
