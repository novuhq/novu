import { useMemo } from 'react';
import {
  RiBuildingLine,
  RiCodeLine,
  RiGlobalLine,
  RiHashtag,
  RiKey2Line,
  RiLayoutGridLine,
  RiMailLine,
  RiRouteFill,
  RiSettings3Line,
  RiStore3Line,
  RiTranslate2,
  RiUserLine,
} from 'react-icons/ri';
import { useLocation } from 'react-router-dom';
import { Bell, NovuIcon } from '@/components/icons';

export const DRAWER_WIDTH_DEFAULT = 350;
export const DRAWER_WIDTH_EXPANDED = 700;

const DOCS_BASE_URL = 'https://docs.novu.co';
const UTM_SUFFIX = '?utm_campaign=support_drawer';

export const BOOK_DEMO_URL = `https://cal.com/team/novu/intro${UTM_SUFFIX}`;
export const CHANGELOG_URL = `https://go.novu.co/changelog${UTM_SUFFIX}`;
export const ROADMAP_URL = `https://roadmap.novu.co/roadmap${UTM_SUFFIX}`;

export function docsUrl(path = '') {
  const [basePath, hash] = path.split('#');
  const url = `${DOCS_BASE_URL}${basePath}${UTM_SUFFIX}`;

  return hash ? `${url}#${hash}` : url;
}

export function toEmbedUrl(url: string) {
  const [baseWithParams, hash] = url.split('#');
  const embedUrl = `${baseWithParams}&full=true`;

  return hash ? `${embedUrl}#${hash}` : embedUrl;
}

export type SuggestionItem = {
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

export function useContextualSuggestions(): SuggestionItem[] {
  const location = useLocation();

  return useMemo(() => {
    const context = getRouteContext(location.pathname);

    return CONTEXTUAL_SUGGESTIONS[context];
  }, [location.pathname]);
}

export const GETTING_STARTED: SuggestionItem[] = [
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
