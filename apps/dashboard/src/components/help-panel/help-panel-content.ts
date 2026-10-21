import type { IconType } from 'react-icons';
import {
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiBuildingLine,
  RiChat3Line,
  RiDatabase2Line,
  RiDiscussLine,
  RiGroup2Line,
  RiKey2Line,
  RiLayout5Line,
  RiLineChartLine,
  RiMailLine,
  RiPlayCircleLine,
  RiRobot2Line,
  RiRouteLine,
  RiSettings4Line,
  RiSignalTowerLine,
  RiStore3Line,
  RiTranslate2,
} from 'react-icons/ri';
import { isWorkflowEditorPath } from '@/utils/routes';
import { docsUrl } from './help-links';

export type HelpLink = {
  icon: IconType;
  title: string;
  url: string;
};

export type HelpPageContext = {
  icon: IconType;
  label: string;
  assistantContext: string;
};

export type HelpPage = {
  matches: (pathname: string) => boolean;
  context: HelpPageContext | null;
  questions: string[];
  startHere: HelpLink[];
};

const DEFAULT_QUESTIONS = [
  'How do I send my first notification?',
  'How do I add the Inbox to my app?',
  'How do I connect an email provider?',
];

const DEFAULT_START_HERE: HelpLink[] = [
  { icon: RiPlayCircleLine, title: 'Learn the basics', url: docsUrl('/platform/what-is-novu') },
  { icon: RiMailLine, title: 'Connect an email provider', url: docsUrl('/platform/integrations/email') },
];

const AGENT_START_HERE: HelpLink[] = [
  { icon: RiPlayCircleLine, title: 'What is ACI?', url: docsUrl('/agents/get-started/what-is-aci') },
  { icon: RiBookOpenLine, title: 'Agents mental model', url: docsUrl('/agents/get-started/mental-model') },
];

function dashboardPage(
  pathSegment: string,
  icon: IconType,
  label: string,
  questions: string[],
  startHere = DEFAULT_START_HERE
): HelpPage {
  return {
    matches: (pathname) => pathname.includes(pathSegment),
    context: { icon, label, assistantContext: `I'm on the ${label} page of the Novu dashboard.` },
    questions,
    startHere,
  };
}

export const WORKFLOW_EDITOR_PAGE = {
  matches: isWorkflowEditorPath,
  context: {
    icon: RiRouteLine,
    label: 'Current workflow',
    assistantContext: "I'm in the Novu dashboard workflow editor.",
  },
  questions: [
    'How do I add a delay before the email step?',
    'Can I skip the email if the in-app was read?',
    'How do I test with a real subscriber?',
  ],
  startHere: DEFAULT_START_HERE,
} satisfies HelpPage;

const DEFAULT_PAGE: HelpPage = {
  matches: () => true,
  context: null,
  questions: DEFAULT_QUESTIONS,
  startHere: DEFAULT_START_HERE,
};

/** Ordered: the first page whose path matches wins. */
const HELP_PAGES: HelpPage[] = [
  WORKFLOW_EDITOR_PAGE,
  dashboardPage('/workflows', RiRouteLine, 'Workflows', [
    'How do I create my first workflow?',
    'How do I trigger a workflow from my backend?',
    'What is the difference between Development and Production?',
  ]),
  dashboardPage('/subscribers', RiGroup2Line, 'Subscribers', [
    'How do I create subscribers from my backend?',
    'How do subscriber preferences work?',
    'How do I store custom data on a subscriber?',
  ]),
  dashboardPage('/integrations', RiStore3Line, 'Integration store', [
    'How do I connect an email provider?',
    'Can I use different providers per tenant?',
    'How do I test without configuring a provider?',
  ]),
  dashboardPage('/api-keys', RiKey2Line, 'API keys', [
    'Where do I use the API secret key?',
    'How do I rotate my API keys?',
    'What is the application identifier used for?',
  ]),
  dashboardPage('/activity', RiBarChartBoxLine, 'Activity', [
    'Why was my notification not delivered?',
    'How do I debug a failed workflow run?',
    'What do the activity statuses mean?',
  ]),
  dashboardPage('/analytics', RiLineChartLine, 'Usage', [
    'What do the delivery metrics measure?',
    'How do I track notification engagement?',
    'Why was my notification not delivered?',
  ]),
  dashboardPage('/topics', RiDiscussLine, 'Topics', [
    'How do I send a notification to a topic?',
    'How do I add subscribers to a topic?',
    'When should I use topics instead of subscribers?',
  ]),
  dashboardPage('/webhooks', RiSignalTowerLine, 'Webhooks', [
    'Which webhook events can I subscribe to?',
    'How do I verify webhook signatures?',
    'What happens when a webhook delivery fails?',
  ]),
  dashboardPage('/layouts', RiLayout5Line, 'Layouts', [
    'How do I create a reusable email layout?',
    'How do I apply a layout to an email step?',
    'Can I use variables inside a layout?',
  ]),
  dashboardPage('/translations', RiTranslate2, 'Translations', [
    'How do I translate my workflow content?',
    'How does Novu pick the subscriber locale?',
    'How do I upload translation files?',
  ]),
  dashboardPage('/environments', RiDatabase2Line, 'Environments', [
    'How do I publish changes to Production?',
    'What is the difference between Development and Production?',
    'Can I create a custom environment?',
  ]),
  dashboardPage('/contexts', RiBuildingLine, 'Contexts', [
    'What are contexts used for?',
    'How do I pass a context when triggering a workflow?',
    'How do I use context data in my templates?',
  ]),
  dashboardPage('/settings', RiSettings4Line, 'Settings', DEFAULT_QUESTIONS),
  dashboardPage(
    '/agents',
    RiRobot2Line,
    'Agents',
    [
      'How do I connect a LangChain agent to Slack?',
      'How do I connect the Vercel AI SDK to Slack?',
      'What is a managed agent?',
    ],
    AGENT_START_HERE
  ),
  dashboardPage(
    '/conversations',
    RiChat3Line,
    'Conversations',
    [
      'How do I view an agent conversation history?',
      'How do agent conversations work across providers?',
      'How do I connect my agent to Slack?',
    ],
    AGENT_START_HERE
  ),
];

export function getHelpPage(pathname: string): HelpPage {
  return HELP_PAGES.find((page) => page.matches(pathname)) ?? DEFAULT_PAGE;
}
