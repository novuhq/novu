import { useState, cloneElement, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import {
  RiCloseFill,
  RiSearchLine,
  RiQuestionLine,
  RiMessage3Line,
  RiNewspaperLine,
  RiCalendarEventLine,
  RiRouteFill,
  RiCodeLine,
  RiNotification4Fill,
  RiStore3Line,
} from 'react-icons/ri';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { NovuIcon } from '@/components/icons';

const DOCS_BASE_URL = 'https://docs.novu.co';
const UTM_SUFFIX = '?utm_campaign=support_drawer';
const BOOK_DEMO_URL = `https://cal.com/team/novu/intro${UTM_SUFFIX}`;
const CHANGELOG_URL = `https://go.novu.co/changelog${UTM_SUFFIX}`;

function docsUrl(path = '') {
  return `${DOCS_BASE_URL}${path}${UTM_SUFFIX}`;
}

type SuggestionItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  url: string;
};

const suggestions: SuggestionItem[] = [
  {
    icon: RiRouteFill,
    title: 'Understand steps',
    description: 'What each step does—like Delay, Digest, Email, and when to use them.',
    url: docsUrl('/platform/workflow/overview'),
  },
  {
    icon: RiCodeLine,
    title: 'Using variables',
    description: 'Say hello with {{firstName}}. Personal, but scalable.',
    url: docsUrl('/framework/controls#using-variables'),
  },
];

const gettingStarted: SuggestionItem[] = [
  {
    icon: NovuIcon,
    title: 'Learn the basics',
    description: 'A quick tour of how Novu does what it does best.',
    url: docsUrl('/platform/overview'),
  },
  {
    icon: RiNotification4Fill,
    title: '<Inbox/> Component',
    description: 'Triggers, delays, emails—mix them like a wizard.',
    url: docsUrl('/platform/inbox/overview'),
  },
  {
    icon: RiStore3Line,
    title: 'Connect providers',
    description: 'Email, SMS, chat—whatever you need to reach users.',
    url: docsUrl('/integrations/overview'),
  },
];

type SuggestionCardProps = {
  item: SuggestionItem;
  onClick: () => void;
};

function SuggestionCard({ item, onClick }: SuggestionCardProps) {
  const Icon = item.icon;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="bg-background hover:bg-neutral-50 border-stroke-soft flex w-full items-center gap-2 rounded-xl border p-2 transition-colors"
    >
      <div className="border-stroke-soft flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-px">
        <div className="bg-neutral-alpha-50 flex size-[54px] items-center justify-center rounded-[7px]">
          <Icon className="text-foreground-400 size-4" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.084px]">{item.title}</span>
        <span className="text-foreground-400 text-xs leading-4">{item.description}</span>
      </div>
    </a>
  );
}

type FooterLinkProps = {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
};

function FooterLink({ icon: Icon, children, onClick }: FooterLinkProps) {
  return (
    <button
      onClick={onClick}
      className="hover:bg-neutral-50 flex h-7 w-full items-center gap-1.5 rounded-md px-2 transition-colors"
    >
      <Icon className="text-foreground-600 size-4 shrink-0" />
      <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.28px]">{children}</span>
    </button>
  );
}

type SupportDrawerContentProps = {
  onClose: () => void;
};

function SupportDrawerContent({ onClose }: SupportDrawerContentProps) {
  const [searchValue, setSearchValue] = useState('');
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();

  function handleSuggestionClick() {
    onClose();
  }

  function handleAskQuestion() {
    if (isLiveChatVisible) {
      showPlainLiveChat();
      onClose();
    } else {
      window.open(docsUrl(), '_blank');
    }
  }

  function handleShareFeedback() {
    if (isLiveChatVisible) {
      showPlainLiveChat();
      onClose();
    } else {
      window.open(docsUrl(), '_blank');
    }
  }

  function handleWhatsNew() {
    window.open(CHANGELOG_URL, '_blank');
    onClose();
  }

  function handleBookDemo() {
    window.open(BOOK_DEMO_URL, '_blank');
    onClose();
  }

  const filteredSuggestions = searchValue
    ? suggestions.filter(
        (item) =>
          item.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.description.toLowerCase().includes(searchValue.toLowerCase())
      )
    : suggestions;

  const filteredGettingStarted = searchValue
    ? gettingStarted.filter(
        (item) =>
          item.title.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.description.toLowerCase().includes(searchValue.toLowerCase())
      )
    : gettingStarted;

  return (
    <div className="bg-neutral-50 border-stroke-soft fixed inset-y-0 right-0 z-50 m-[10px] flex w-[350px] flex-col overflow-hidden rounded-xl border shadow-[0px_18px_88px_-4px_rgba(24,39,75,0.16)]">
      <div className="flex items-center justify-between px-3 py-3.5">
        <span className="text-foreground-600 text-sm font-medium leading-5 tracking-[-0.084px]">Need a hand?</span>
        <button
          onClick={onClose}
          className="hover:bg-neutral-100 flex size-4 items-center justify-center rounded transition-colors"
        >
          <RiCloseFill className="text-foreground-600 size-4" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="bg-background border-stroke-soft flex items-center gap-2 rounded-lg border p-2 shadow-xs">
          <RiSearchLine className="text-foreground-400 size-3.5 shrink-0" />
          <input
            type="text"
            placeholder="Type away… we're all ears."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="text-foreground-950 placeholder:text-foreground-400 min-w-0 flex-1 bg-transparent text-sm font-medium leading-5 tracking-[-0.084px] outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-3">
        <div className="flex flex-col gap-6">
          {filteredSuggestions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                Suggestions
              </span>
              <div className="flex flex-col gap-2">
                {filteredSuggestions.map((item) => (
                  <SuggestionCard key={item.title} item={item} onClick={handleSuggestionClick} />
                ))}
              </div>
            </div>
          )}

          {filteredGettingStarted.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                Getting started
              </span>
              <div className="flex flex-col gap-2">
                {filteredGettingStarted.map((item) => (
                  <SuggestionCard key={item.title} item={item} onClick={handleSuggestionClick} />
                ))}
              </div>
            </div>
          )}

          {filteredSuggestions.length === 0 && filteredGettingStarted.length === 0 && (
            <div className="text-foreground-400 py-8 text-center text-sm">No results found</div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 p-1.5">
        <FooterLink icon={RiQuestionLine} onClick={handleAskQuestion}>
          Ask a question
        </FooterLink>
        <FooterLink icon={RiMessage3Line} onClick={handleShareFeedback}>
          Share feedback
        </FooterLink>
        <FooterLink icon={RiNewspaperLine} onClick={handleWhatsNew}>
          What's new
        </FooterLink>
        <FooterLink icon={RiCalendarEventLine} onClick={handleBookDemo}>
          <span>
            Book a demo <span className="text-foreground-400">(Yes, with a real human)</span>
          </span>
        </FooterLink>
      </div>
    </div>
  );
}

type SupportDrawerProps = {
  children: React.ReactElement;
};

export function SupportDrawer({ children }: SupportDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const trigger = isValidElement(children)
    ? cloneElement(children, { onClick: () => setIsOpen(true) } as React.HTMLAttributes<HTMLElement>)
    : children;

  return (
    <>
      {trigger}
      {isOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <SupportDrawerContent onClose={() => setIsOpen(false)} />
          </>,
          document.body
        )}
    </>
  );
}
