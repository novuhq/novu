import { CopilotPageEnum } from '@novu/shared';
import { matchPath } from 'react-router-dom';
import { isWorkflowEditorPath, ROUTES } from '@/utils/routes';

/** What the Copilot shows on a dashboard page outside the workflow editor. */
export type CopilotPageConfig = {
  /** The `ROUTES` patterns that belong to the page. */
  routes: readonly string[];
  emptyState: { title: string; body: string };
  placeholder: string;
  suggestions: readonly string[];
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
  },
  [CopilotPageEnum.SUBSCRIBERS]: {
    routes: [ROUTES.SUBSCRIBERS, ROUTES.EDIT_SUBSCRIBER],
    emptyState: {
      title: 'Ask about subscribers',
      body: 'I check which channels can reach a subscriber and why not. Every answer names the environment it used.',
    },
    placeholder: 'Ask about a subscriber…',
    suggestions: ['Can we reach jane@acme.com on SMS?', "Why didn't user_123 get their last notification?"],
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

export type CopilotPageCopy = Omit<CopilotPageConfig, 'routes' | 'suggestions'> & { suggestions: string[] };

/** The page's empty state, composer placeholder and suggestions, led by `question` about what is open on it. */
export function getCopilotPageCopy(page: CopilotPageEnum, question?: string): CopilotPageCopy | undefined {
  const config = COPILOT_PAGE_CONFIGS[page];
  if (!config) return undefined;

  const suggestions = config.suggestions.filter((suggestion) => suggestion !== question);

  return {
    emptyState: config.emptyState,
    placeholder: config.placeholder,
    suggestions: question ? [question, ...suggestions] : suggestions,
  };
}

/** The question about the workflow run open in the Activity side panel; its Ask Copilot button prefills it too. */
export function getWorkflowRunQuestion(isFailed: boolean): string {
  return isFailed ? 'Why did this run fail?' : 'Explain this run';
}
