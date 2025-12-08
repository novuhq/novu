import { InkeepEmbeddedSearch, InkeepEmbeddedSearchProps } from '@inkeep/cxkit-react';
import { AnimatePresence, motion } from 'motion/react';
import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiArrowLeftLine,
  RiBook2Line,
  RiBuildingLine,
  RiCalendarEventLine,
  RiCodeLine,
  RiExternalLinkLine,
  RiGlobalLine,
  RiHashtag,
  RiKey2Line,
  RiLayoutGridLine,
  RiLoaderLine,
  RiMailLine,
  RiMessage3Line,
  RiNewspaperLine,
  RiRouteFill,
  RiSettings3Line,
  RiStore3Line,
  RiTranslate2,
  RiUserLine,
} from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import { Bell, NovuIcon } from '@/components/icons';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

const DRAWER_WIDTH_DEFAULT = 350;
const DRAWER_WIDTH_EXPANDED = 700;

const DOCS_BASE_URL = 'https://docs.novu.co';
const UTM_SUFFIX = '?utm_campaign=support_drawer';
const BOOK_DEMO_URL = `https://cal.com/team/novu/intro${UTM_SUFFIX}`;
const CHANGELOG_URL = `https://go.novu.co/changelog${UTM_SUFFIX}`;
const ROADMAP_URL = `https://roadmap.novu.co/roadmap${UTM_SUFFIX}`;

// Hash fragments must come after query params in URLs
// e.g. docsUrl('/framework/controls#using-variables') => https://docs.novu.co/framework/controls?utm_campaign=support_drawer#using-variables
// otherwise the page will scroll to the top of the page instead of the desired section
function docsUrl(path = '') {
  const [basePath, hash] = path.split('#');
  const url = `${DOCS_BASE_URL}${basePath}${UTM_SUFFIX}`;

  return hash ? `${url}#${hash}` : url;
}

function toEmbedUrl(url: string) {
  const [baseWithParams, hash] = url.split('#');
  const embedUrl = `${baseWithParams}&full=true`;

  return hash ? `${embedUrl}#${hash}` : embedUrl;
}

type SuggestionItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  url: string;
};

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  {
    icon: RiRouteFill,
    title: 'Understand Novu',
    description: 'Learn what Novu is and how it simplifies notification delivery across channels.',
    url: docsUrl('platform/what-is-novu'),
  },
  {
    icon: RiCodeLine,
    title: 'Introduction to Inbox',
    description: 'Build an in-app notification center that keeps your users engaged.',
    url: docsUrl('/platform/inbox/overview'),
  },
];

type RouteContext =
  | 'workflows'
  | 'workflowEditor'
  | 'subscribers'
  | 'integrations'
  | 'apiKeys'
  | 'activity'
  | 'analytics'
  | 'topics'
  | 'webhooks'
  | 'layouts'
  | 'translations'
  | 'settings'
  | 'environments'
  | 'contexts'
  | 'default';

const CONTEXTUAL_SUGGESTIONS: Record<RouteContext, SuggestionItem[]> = {
  workflows: [
    {
      icon: RiRouteFill,
      title: 'Creating workflows',
      description: 'Learn how to create and configure notification workflows.',
      url: docsUrl('/platform/workflow/overview'),
    },
    {
      icon: RiCodeLine,
      title: 'Using variables',
      description: 'Say hello with {{firstName}}. Personal, but scalable.',
      url: docsUrl('/framework/controls#using-variables'),
    },
  ],
  workflowEditor: [
    {
      icon: RiRouteFill,
      title: 'Understand workflow editor',
      description: 'What the workflow editor does—like Delay, Digest, Email, and when to use them.',
      url: docsUrl('/platform/workflow/overview'),
    },
    {
      icon: RiCodeLine,
      title: 'Using variables',
      description: 'Say hello with {{firstName}}. Personal, but scalable.',
      url: docsUrl('/framework/controls#using-variables'),
    },
  ],
  subscribers: [
    {
      icon: RiUserLine,
      title: 'Managing subscribers',
      description: 'Learn how to create, update, and manage your notification subscribers.',
      url: docsUrl('/platform/concepts/subscribers'),
    },
    {
      icon: RiSettings3Line,
      title: 'Subscriber preferences',
      description: 'Let users control what notifications they receive.',
      url: docsUrl('/platform/concepts/preferences'),
    },
  ],
  integrations: [
    {
      icon: RiStore3Line,
      title: 'Connect providers',
      description: 'Email, SMS, chat—whatever you need to reach users.',
      url: docsUrl('/integrations/overview'),
    },
    {
      icon: RiSettings3Line,
      title: 'Try demo providers',
      description: 'Test notifications without configuring a provider.',
      url: docsUrl('/platform/integrations/demo-providers'),
    },
  ],
  apiKeys: [
    {
      icon: RiCodeLine,
      title: 'REST API reference',
      description: "Learn how to authenticate and work with Novu's API endpoints.",
      url: docsUrl('/api-reference/overview'),
    },
  ],
  activity: DEFAULT_SUGGESTIONS,
  analytics: DEFAULT_SUGGESTIONS,
  topics: [
    {
      icon: RiHashtag,
      title: 'Working with topics',
      description: 'Group subscribers and send bulk notifications efficiently.',
      url: docsUrl('/platform/concepts/topics'),
    },
    {
      icon: RiUserLine,
      title: 'Topic subscriptions',
      description: 'Manage who receives notifications for each topic.',
      url: docsUrl('/concepts/topics#dynamic-and-decoupled-grouping'),
    },
  ],
  webhooks: [
    {
      icon: RiGlobalLine,
      title: 'Webhook setup',
      description: 'Receive real-time updates about notification events.',
      url: docsUrl('/platform/additional-resources/webhooks'),
    },
    {
      icon: RiCodeLine,
      title: 'Webhook events',
      description: 'Learn about the events you can subscribe to.',
      url: docsUrl('/platform/additional-resources/webhooks#supported-event-types'),
    },
  ],
  layouts: [
    {
      icon: RiLayoutGridLine,
      title: 'Creating layouts',
      description: 'Design reusable templates for consistent notifications.',
      url: docsUrl('/platform/workflow/layouts'),
    },
    {
      icon: RiMailLine,
      title: 'Using layouts in workflows',
      description: 'Apply layouts to email steps for consistent branding across notifications.',
      url: docsUrl('/platform/workflow/layouts#using-a-layout-in-workflow-email-step'),
    },
  ],
  translations: [
    {
      icon: RiTranslate2,
      title: 'Translations',
      description: 'Learn how to translate your workflow step content into multiple languages',
      url: docsUrl('/platform/workflow/translations'),
    },
    {
      icon: RiSettings3Line,
      title: 'Managing translations',
      description: 'Upload and manage translation files for your content.',
      url: docsUrl('/api-reference/translations/create-a-translation'),
    },
  ],
  environments: [
    {
      icon: RiSettings3Line,
      title: 'Understanding environments',
      description: 'Learn how Novu uses environments to separate development and production workflows.',
      url: docsUrl('/platform/concepts/environments'),
    },
    {
      icon: RiKey2Line,
      title: 'Environment credentials',
      description: 'Understand Application Identifier and API Secret Key for each environment.',
      url: docsUrl('/platform/concepts/environments#environment-credentials'),
    },
    {
      icon: RiRouteFill,
      title: 'Publishing changes',
      description: 'Promote workflows, layouts, and translations from Development to other environments.',
      url: docsUrl('/platform/concepts/environments#publishing-changes-to-other-environments'),
    },
  ],
  contexts: [
    {
      icon: RiBuildingLine,
      title: 'Understanding contexts',
      description: 'Learn how to create, update, and delete contexts to manage reusable metadata.',
      url: docsUrl('/platform/workflow/contexts/manage-contexts'),
    },
    {
      icon: RiCodeLine,
      title: 'Context object schema',
      description: 'Learn about context types, IDs, and data formats for storing metadata.',
      url: docsUrl('/platform/workflow/contexts/manage-contexts#context-object-schema'),
    },
    {
      icon: RiSettings3Line,
      title: 'Managing contexts',
      description: 'Create, update, and delete contexts via dashboard or API.',
      url: docsUrl('/platform/workflow/contexts/manage-contexts#create-a-context'),
    },
  ],
  settings: DEFAULT_SUGGESTIONS,
  default: DEFAULT_SUGGESTIONS,
};

function getRouteContext(pathname: string): RouteContext {
  if (/\/workflows\/[^/]+/.test(pathname)) return 'workflowEditor';
  if (pathname.includes('/workflows')) return 'workflows';
  if (pathname.includes('/subscribers')) return 'subscribers';
  if (pathname.includes('/integrations')) return 'integrations';
  if (pathname.includes('/api-keys')) return 'apiKeys';
  if (pathname.includes('/activity')) return 'activity';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/topics')) return 'topics';
  if (pathname.includes('/webhooks')) return 'webhooks';
  if (pathname.includes('/layouts')) return 'layouts';
  if (pathname.includes('/translations')) return 'translations';
  if (pathname.includes('/environments')) return 'environments';
  if (pathname.includes('/contexts')) return 'contexts';
  if (pathname.includes('/settings')) return 'settings';

  return 'default';
}

function useContextualSuggestions(): SuggestionItem[] {
  const location = useLocation();

  return useMemo(() => {
    const context = getRouteContext(location.pathname);

    return CONTEXTUAL_SUGGESTIONS[context];
  }, [location.pathname]);
}

const gettingStarted: SuggestionItem[] = [
  {
    icon: NovuIcon,
    title: 'Learn the basics',
    description: 'A quick tour of how Novu does what it does best.',
    url: docsUrl('/platform/overview'),
  },
  {
    icon: Bell,
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
  onOpenDocs: (url: string) => void;
  onTrack: (title: string) => void;
};

function SuggestionCard({ item, onOpenDocs, onTrack }: SuggestionCardProps) {
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        onTrack(item.title);
        onOpenDocs(item.url);
      }}
      className="bg-background hover:bg-neutral-50 border-stroke-soft group flex w-full items-center gap-2 rounded-xl border p-2 transition-colors text-left"
    >
      <div className="border-stroke-soft flex shrink-0 items-center justify-center overflow-hidden rounded-lg border p-px">
        <div className="bg-neutral-alpha-50 group-hover:bg-white flex size-[54px] items-center justify-center rounded-[7px] transition-colors">
          <Icon className="text-foreground-300 size-4" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.084px]">{item.title}</span>
        <span className="text-foreground-400 text-xs leading-4">{item.description}</span>
      </div>
    </button>
  );
}

type DocsIframeViewProps = {
  url: string;
  onBack: () => void;
  onTrackBack: () => void;
  onTrackExternal: () => void;
};

function DocsIframeView({ url, onBack, onTrackBack, onTrackExternal }: DocsIframeViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const embedUrl = toEmbedUrl(url);

  useEffect(() => {
    const ensurePrefetch = () => {
      const existingPrefetch = document.querySelector('link[rel="dns-prefetch"][href="https://docs.novu.co"]');
      const existingPreconnect = document.querySelector('link[rel="preconnect"][href="https://docs.novu.co"]');

      if (!existingPrefetch) {
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'dns-prefetch';
        prefetchLink.href = 'https://docs.novu.co';
        document.head.appendChild(prefetchLink);
      }

      if (!existingPreconnect) {
        const preconnectLink = document.createElement('link');
        preconnectLink.rel = 'preconnect';
        preconnectLink.href = 'https://docs.novu.co';
        document.head.appendChild(preconnectLink);
      }
    };

    ensurePrefetch();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 px-3 py-3.5 pr-14">
        <button
          onClick={() => {
            onTrackBack();
            onBack();
          }}
          className="hover:bg-neutral-100 -ml-1.5 flex size-5 items-center justify-center rounded transition-colors"
        >
          <RiArrowLeftLine className="text-foreground-600 size-3.5" />
        </button>
        <span className="text-foreground-600 flex-1 text-sm font-medium leading-5 tracking-[-0.084px]">
          Documentation
        </span>
        <button
          onClick={() => {
            onTrackExternal();
            window.open(url, '_blank noopener noreferrer');
          }}
          className="hover:bg-neutral-100 flex size-5 items-center justify-center rounded transition-colors"
          title="Open in new tab"
        >
          <RiExternalLinkLine className="text-foreground-600 size-3.5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-b-xl">
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0 flex items-center justify-center bg-neutral-50"
            >
              <RiLoaderLine className="text-foreground-400 size-6 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
        <iframe
          src={embedUrl}
          className="h-full w-full border-0"
          onLoad={() => setIsLoading(false)}
          title="Documentation"
        />
      </div>
    </div>
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
      className="hover:bg-neutral-alpha-50 flex h-7 w-full items-center gap-1.5 rounded-md px-2 transition-colors"
    >
      <Icon className="text-foreground-600 size-4 shrink-0" />
      <span className="text-foreground-950 text-sm font-medium leading-5 tracking-[-0.28px]">{children}</span>
    </button>
  );
}

type SupportDrawerContentProps = {
  onClose: () => void;
  docsUrl: string | null;
  onOpenDocs: (url: string) => void;
  onCloseDocs: () => void;
};

function SupportDrawerContent({
  onClose,
  docsUrl: currentDocsUrl,
  onOpenDocs,
  onCloseDocs,
}: SupportDrawerContentProps) {
  const telemetry = useTelemetry();
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();
  const suggestions = useContextualSuggestions();
  const searchFunctionsRef = useRef<any>(null);
  const [hasSearchQuery, setHasSearchQuery] = useState(false);

  const hasInkeep = !!import.meta.env.VITE_INKEEP_API_KEY;
  const isViewingDocs = currentDocsUrl !== null;

  const inkeepConfig: InkeepEmbeddedSearchProps = {
    baseSettings: {
      apiKey: import.meta.env.VITE_INKEEP_API_KEY,
      organizationDisplayName: 'Novu',
      primaryBrandColor: '#DD2476',
      theme: {
        styles: [
          {
            key: 'support-drawer-search',
            type: 'style',
            value: `
              .ikp-ai-search-input-group {
                display: flex;
                align-items: center;
                height: 36px;
                gap: 8px;
                padding: 8px;
                border: 1px solid #E1E4EA;
                border-radius: 8px;
                background: #FFFFFF;
                box-shadow: 0px 1px 2px 0px rgba(10, 13, 20, 0.03);
              }
              .ikp-ai-search-input-group input {
                font-size: 14px;
                font-weight: 500;
                line-height: 20px;
                letter-spacing: -0.084px;
              }
              .ikp-ai-search-input-group input::placeholder {
                color: #99A0AE;
              }
              .ikp-ai-search-input-group svg {
                min-width: 14px !important;
                min-height: 14px !important;
                max-width: 14px !important;
                max-height: 14px !important;
              }
            `,
          },
        ],
      },
    },
    searchSettings: {
      placeholder: "Type away… we're all ears.",
      searchFunctionsRef,
      onQueryChange: (query) => setHasSearchQuery(query.length > 0),
    },
    shouldAutoFocusInput: false,
  };

  function handleTrackSuggestion(title: string) {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_SUGGESTION_CLICKED, { suggestionTitle: title });
  }

  function handleTrackDocsBack() {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCS_BACK_CLICKED);
  }

  function handleTrackDocsExternal() {
    telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCS_EXTERNAL_CLICKED);
  }

  function handleShareFeedback() {
    if (isLiveChatVisible) {
      showPlainLiveChat();
      onClose();
    } else {
      handleOpenExternalLink(docsUrl());
    }
  }

  function handleOpenExternalLink(url: string) {
    window.open(url, '_blank noopener noreferrer');
    onClose();
  }

  if (isViewingDocs) {
    return (
      <DocsIframeView
        url={currentDocsUrl}
        onBack={onCloseDocs}
        onTrackBack={handleTrackDocsBack}
        onTrackExternal={handleTrackDocsExternal}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <VisuallyHidden>
        <SheetTitle>Support</SheetTitle>
        <SheetDescription>Get help and resources</SheetDescription>
      </VisuallyHidden>

      <div className="flex items-center justify-between px-3 py-3.5">
        <span className="text-foreground-600 text-sm font-medium leading-5 tracking-[-0.084px]">Need a hand?</span>
      </div>

      <div className="px-3 pb-2">{hasInkeep ? <InkeepEmbeddedSearch {...inkeepConfig} /> : null}</div>

      <div className="flex-1 overflow-auto px-3 py-3">
        <AnimatePresence mode="wait">
          {!hasSearchQuery && (
            <motion.div
              key="suggestions-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col gap-6"
            >
              {suggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                    Suggestions
                  </span>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((item) => (
                      <SuggestionCard
                        key={item.title}
                        item={item}
                        onOpenDocs={onOpenDocs}
                        onTrack={handleTrackSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {gettingStarted.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-foreground-600 px-1 text-sm font-medium leading-5 tracking-[-0.084px]">
                    Getting started
                  </span>
                  <div className="flex flex-col gap-2">
                    {gettingStarted.map((item) => (
                      <SuggestionCard
                        key={item.title}
                        item={item}
                        onOpenDocs={onOpenDocs}
                        onTrack={handleTrackSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-0.5 p-1.5">
        <FooterLink
          icon={RiBook2Line}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_DOCUMENTATION_CLICKED);
            handleOpenExternalLink(docsUrl());
          }}
        >
          Documentation
        </FooterLink>
        <FooterLink
          icon={RiNewspaperLine}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_CHANGELOG_CLICKED);
            handleOpenExternalLink(CHANGELOG_URL);
          }}
        >
          What's new
        </FooterLink>
        <FooterLink
          icon={RiRouteFill}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_ROADMAP_CLICKED);
            handleOpenExternalLink(ROADMAP_URL);
          }}
        >
          Roadmap
        </FooterLink>
        <FooterLink
          icon={RiMessage3Line}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_CHAT_CLICKED);
            handleShareFeedback();
          }}
        >
          Chat with us
        </FooterLink>
        <FooterLink
          icon={RiCalendarEventLine}
          onClick={() => {
            telemetry(TelemetryEvent.SUPPORT_DRAWER_BOOK_DEMO_CLICKED);
            handleOpenExternalLink(BOOK_DEMO_URL);
          }}
        >
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
  const telemetry = useTelemetry();
  const [isOpen, setIsOpen] = useState(false);
  const [docsUrl, setDocsUrl] = useState<string | null>(null);

  const isViewingDocs = docsUrl !== null;
  const drawerWidth = isViewingDocs ? DRAWER_WIDTH_EXPANDED : DRAWER_WIDTH_DEFAULT;

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      telemetry(TelemetryEvent.SUPPORT_DRAWER_OPENED);
    }
    if (!open) {
      setDocsUrl(null);
    }
  }

  function handleOpenDocs(url: string) {
    setDocsUrl(url);
  }

  function handleCloseDocs() {
    setDocsUrl(null);
  }

  const trigger = isValidElement(children)
    ? cloneElement(children, { onClick: () => setIsOpen(true) } as React.HTMLAttributes<HTMLElement>)
    : children;

  return (
    <>
      {trigger}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          className="border-stroke-soft m-[10px] h-[calc(100%-20px)] rounded-xl border bg-neutral-50 p-0 shadow-[0px_18px_88px_-4px_rgba(24,39,75,0.16)] transition-[width,max-width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          style={{ width: drawerWidth, maxWidth: drawerWidth }}
        >
          <SupportDrawerContent
            onClose={() => handleOpenChange(false)}
            docsUrl={docsUrl}
            onOpenDocs={handleOpenDocs}
            onCloseDocs={handleCloseDocs}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
