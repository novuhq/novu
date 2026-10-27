import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { type ReactNode, useMemo } from 'react';
import {
  RiBookOpenLine,
  RiCalendarEventLine,
  RiFileTextLine,
  RiMessage3Line,
  RiNewspaperLine,
  RiQuestionLine,
  RiSparklingLine,
} from 'react-icons/ri';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { DOCS_PAGES } from './docs-index';
import { type HighlightSegment, searchDocs } from './docs-search';
import { docsUrl } from './help-links';
import type { HelpPage } from './help-panel-content';
import { HelpFooterLink, HelpKeyHint } from './help-panel-footer';
import { HELP_PANEL_SHORTCUT_LABEL, stopCommandKeyHandling } from './help-panel-shortcut';
import { HelpRow } from './help-row';
import { HelpSection } from './help-section';
import type { HelpActions } from './use-help-actions';
import { useWhatsNewUnread } from './use-whats-new-unread';

const DOCS_RESULTS_LIMIT = 4;
const ASK_AI_VALUE = 'ask-ai';

function HelpList({ children }: { children: ReactNode }) {
  return (
    <CommandPrimitive.List className="max-h-[min(480px,calc(100vh-180px))] overflow-y-auto overscroll-contain">
      {children}
    </CommandPrimitive.List>
  );
}

function ChatWithUsRow({ actions }: { actions: HelpActions }) {
  return (
    <HelpSection>
      <HelpRow
        kind="tile"
        value="chat"
        icon={RiMessage3Line}
        label="Chat with us"
        description="Ask your questions to a real human"
        onSelect={actions.chatWithUs}
      />
    </HelpSection>
  );
}

function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  return segments.map((segment, index) => (
    <span key={index} className={segment.isMatch ? 'text-text-strong' : undefined}>
      {segment.text}
    </span>
  ));
}

function SearchFooter() {
  const selectedValue = useCommandState((state) => state.value);

  return (
    <div className="flex items-center gap-3.5 border-t border-stroke-soft px-3.5 py-[9px]">
      <HelpKeyHint keys="↑↓">navigate</HelpKeyHint>
      <HelpKeyHint keys="↵">{selectedValue === ASK_AI_VALUE ? 'ask' : 'open'}</HelpKeyHint>
      <HelpKeyHint keys="esc">close</HelpKeyHint>
    </div>
  );
}

export function HelpSearchView({ query, actions }: { query: string; actions: HelpActions }) {
  const docsResults = useMemo(() => searchDocs(query, DOCS_PAGES, DOCS_RESULTS_LIMIT), [query]);

  return (
    <>
      <HelpList>
        {IS_AI_FEATURES_ENABLED ? (
          <HelpSection>
            <HelpRow
              kind="action"
              value={ASK_AI_VALUE}
              icon={RiSparklingLine}
              label="Ask AI"
              onSelect={() => actions.askAi(query, 'query')}
            />
          </HelpSection>
        ) : null}
        {docsResults.length > 0 ? (
          <HelpSection heading="Docs pages">
            {docsResults.map(({ page, segments }) => (
              <HelpRow
                key={page.title}
                kind="result"
                value={`doc:${page.title}`}
                icon={RiFileTextLine}
                label={<HighlightedText segments={segments} />}
                onSelect={() => actions.openDocsLink(page.title, docsUrl(page.path), true)}
              />
            ))}
          </HelpSection>
        ) : null}
        {!IS_AI_FEATURES_ENABLED && docsResults.length === 0 ? (
          <HelpSection>
            <p className="px-2.5 py-2 text-paragraph-xs text-text-soft">No docs pages match “{query}”.</p>
          </HelpSection>
        ) : null}
        <ChatWithUsRow actions={actions} />
      </HelpList>
      <SearchFooter />
    </>
  );
}

function DefaultFooter({ actions }: { actions: HelpActions }) {
  const { hasUnread, markAsSeen } = useWhatsNewUnread();

  return (
    <fieldset
      aria-label="Help resources"
      className="flex min-w-0 items-center gap-0.5 border-t border-stroke-soft bg-bg-weak py-1.5 pl-2 pr-3.5"
      onKeyDown={stopCommandKeyHandling}
    >
      <HelpFooterLink
        icon={RiNewspaperLine}
        hasIndicator={hasUnread}
        onClick={() => {
          markAsSeen();
          actions.openChangelog();
        }}
      >
        What’s new
      </HelpFooterLink>
      <HelpFooterLink icon={RiMessage3Line} onClick={actions.shareFeedback}>
        Feedback
      </HelpFooterLink>
      <HelpFooterLink icon={RiBookOpenLine} onClick={actions.openDocs}>
        Docs
      </HelpFooterLink>
      <div className="min-w-0 flex-1" />
      <HelpKeyHint keys={HELP_PANEL_SHORTCUT_LABEL}>anywhere</HelpKeyHint>
    </fieldset>
  );
}

export function HelpDefaultView({ page, actions }: { page: HelpPage; actions: HelpActions }) {
  return (
    <>
      <HelpList>
        {IS_AI_FEATURES_ENABLED && page.questions.length > 0 ? (
          <HelpSection heading="Suggestions">
            {page.questions.map((question) => (
              <HelpRow
                key={question}
                value={`question:${question}`}
                icon={RiQuestionLine}
                label={question}
                onSelect={() => actions.askAi(question, 'suggestion')}
              />
            ))}
          </HelpSection>
        ) : null}
        <HelpSection heading="Start here">
          {page.startHere.map((link) => (
            <HelpRow
              key={link.title}
              value={`link:${link.title}`}
              icon={link.icon}
              label={link.title}
              onSelect={() => actions.openDocsLink(link.title, link.url, false)}
            />
          ))}
        </HelpSection>
        <ChatWithUsRow actions={actions} />
        <HelpSection>
          <HelpRow
            kind="tile"
            value="book-demo"
            icon={RiCalendarEventLine}
            label="Book a demo"
            description="Yes, a real human."
            onSelect={actions.bookDemo}
          />
        </HelpSection>
      </HelpList>
      <DefaultFooter actions={actions} />
    </>
  );
}
