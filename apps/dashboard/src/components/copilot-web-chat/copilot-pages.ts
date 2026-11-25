import { CopilotPageEnum } from '@novu/shared';
import type { IconType } from 'react-icons';
import {
  RiBarChart2Line,
  RiBarChartBoxLine,
  RiBarChartGroupedLine,
  RiGroup2Line,
  RiLineChartLine,
  RiPlugLine,
  RiStore3Line,
  RiUser3Line,
} from 'react-icons/ri';
import { matchPath } from 'react-router-dom';
import { isWorkflowEditorPath, ROUTES } from '@/utils/routes';
import { type CopilotPageContext, type CopilotSuggestion, getCopilotContextLabel } from './copilot-web-chat-utils';

/** What the Copilot shows on a dashboard page outside the workflow editor. */
export type CopilotPageConfig = {
  /** The `ROUTES` patterns that belong to the page. */
  routes: readonly string[];
  /** The composer chip: the page's navigation icon always leads it; the label shows while nothing on the page is open. */
  chip: { label: string; icon: IconType };
  emptyState: { title: string; body: string };
  placeholder: string;
  suggestions: readonly string[];
  /** Leads every suggestion row. */
  suggestionIcon: IconType;
};

/** A page listed in `COPILOT_PAGES` stays off until it has an entry here; a new page plugs in by adding one. */
export const COPILOT_PAGE_CONFIGS: Partial<Record<CopilotPageEnum, CopilotPageConfig>> = {
  [CopilotPageEnum.ACTIVITY]: {
    routes: [
      ROUTES.ACTIVITY_FEED,
      ROUTES.ACTIVITY_WORKFLOW_RUNS,
      ROUTES.ACTIVITY_REQUESTS,
      ROUTES.ACTIVITY_CONVERSATIONS,
    ],
    chip: { label: 'Activity', icon: RiBarChartBoxLine },
    emptyState: {
      title: 'Ask about Activity',
      body: 'I read runs, steps and provider responses. Every answer names the environment it used.',
    },
    placeholder: 'Ask anything about Activity…',
    suggestions: [
      'Which runs failed in the last 24 hours?',
      'Did my last trigger reach Novu?',
      'Which workflows had errors today?',
    ],
    suggestionIcon: RiBarChart2Line,
  },
  [CopilotPageEnum.INTEGRATIONS]: {
    routes: [
      ROUTES.INTEGRATIONS,
      ROUTES.INTEGRATIONS_CONNECT,
      ROUTES.INTEGRATIONS_CONNECT_PROVIDER,
      ROUTES.INTEGRATIONS_UPDATE,
    ],
    chip: { label: 'Integrations', icon: RiStore3Line },
    emptyState: {
      title: 'Ask about integrations',
      body: 'I check which providers are set up, active and primary in each environment. Credentials never go through this chat.',
    },
    placeholder: 'Ask anything about integrations…',
    suggestions: [
      'Is push set up in Production?',
      'Which email provider is primary in each environment?',
      'Turn on activity tracking for my email provider',
    ],
    suggestionIcon: RiPlugLine,
  },
  [CopilotPageEnum.SUBSCRIBERS]: {
    routes: [ROUTES.SUBSCRIBERS, ROUTES.CREATE_SUBSCRIBER, ROUTES.EDIT_SUBSCRIBER],
    chip: { label: 'Subscribers', icon: RiGroup2Line },
    emptyState: {
      title: 'Ask about subscribers',
      body: 'I check which channels can reach a subscriber and why not. Every answer names the environment it used.',
    },
    placeholder: 'Ask about a subscriber…',
    suggestions: ['Can we reach jane@acme.com on SMS?', "Why didn't user_123 get their last notification?"],
    suggestionIcon: RiUser3Line,
  },
  [CopilotPageEnum.USAGE]: {
    routes: [ROUTES.ANALYTICS],
    chip: { label: 'Usage', icon: RiLineChartLine },
    emptyState: {
      title: 'Ask about usage',
      body: 'I read the Usage charts: messages per channel and workflow, active subscribers and Inbox interactions. Every answer names the environment and period it used.',
    },
    placeholder: 'Ask about usage…',
    // "In this period" is the period the page shows, which the plan's retention limits; a fixed one could fail.
    suggestions: [
      'How did email do in this period?',
      'Which workflows ran the most in this period?',
      'How many active subscribers did we have in this period?',
    ],
    suggestionIcon: RiBarChartGroupedLine,
  },
};

const CONFIGURED_PAGES = Object.keys(COPILOT_PAGE_CONFIGS) as CopilotPageEnum[];

/** The page a dashboard path belongs to. Never a workflow editor path: the editor mounts its own Copilot. */
export function matchCopilotPage(pathname: string): CopilotPageEnum | undefined {
  if (isWorkflowEditorPath(pathname)) return undefined;

  return CONFIGURED_PAGES.find((page) =>
    COPILOT_PAGE_CONFIGS[page]?.routes.some((route) => matchPath({ path: route, end: true }, pathname))
  );
}

/** The page whose Copilot shows at `pathname`, when `COPILOT_PAGES` turns it on. */
export function resolveActiveCopilotPage(
  pathname: string,
  enabledPages: readonly CopilotPageEnum[]
): CopilotPageEnum | undefined {
  const page = matchCopilotPage(pathname);

  return page && enabledPages.includes(page) ? page : undefined;
}

/** What the thread panel shows before the first message, and the composer under it. */
export type CopilotPanelCopy = {
  emptyState: { title: string; body: string };
  placeholder: string;
  suggestions: CopilotSuggestion[];
  /** What Copilot uses from the open page; none while there is nothing to name. */
  chip?: { label: string; icon?: IconType };
};

// The workflow editor's copy, from the first Copilot design: the v2 design has no workflow editor variant yet.
const WORKFLOW_EDITOR_COPY = {
  emptyState: {
    title: 'Novu Copilot',
    body: 'Suggests improvements, fills gaps, and applies best practices as you build.',
  },
  placeholder: 'Ask anything about this page…',
};

/**
 * On a Copilot page: its copy, its suggestions led by `question` about what is open, and its chip naming the open
 * resource or else the page. In the workflow editor: the suggestions it registered and a chip naming the workflow/step.
 */
export function getCopilotPanelCopy(context: CopilotPageContext | undefined): CopilotPanelCopy {
  const config = context?.page ? COPILOT_PAGE_CONFIGS[context.page] : undefined;
  const contextLabel = getCopilotContextLabel(context);

  if (!config) {
    return {
      ...WORKFLOW_EDITOR_COPY,
      suggestions: context?.suggestions ?? [],
      chip: contextLabel ? { label: contextLabel } : undefined,
    };
  }

  const question = context?.question;
  const suggestions = config.suggestions.filter((suggestion) => suggestion !== question);
  const labels = question ? [question, ...suggestions] : suggestions;

  return {
    emptyState: config.emptyState,
    placeholder: config.placeholder,
    suggestions: labels.map((label) => ({ label, icon: config.suggestionIcon })),
    chip: { label: contextLabel || config.chip.label, icon: config.chip.icon },
  };
}

/** The question about the workflow run open in the Activity side panel; its Ask Copilot button prefills it too. */
export function getWorkflowRunQuestion(isFailed: boolean): string {
  return isFailed ? 'Why did this run fail?' : 'Explain this run';
}
