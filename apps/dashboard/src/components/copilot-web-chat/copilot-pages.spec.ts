import { CopilotPageEnum, CopilotViewingResourceEnum } from '@novu/shared';
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
import { describe, expect, it } from 'vitest';
import {
  getCopilotPanelCopy,
  getWorkflowRunQuestion,
  matchCopilotPage,
  resolveActiveCopilotPage,
} from './copilot-pages';

describe('matchCopilotPage', () => {
  it.each([
    '/env/dev-env/activity-feed',
    '/env/dev-env/activity/workflow-runs',
    '/env/dev-env/activity/requests',
    '/env/dev-env/activity/conversations',
    '/env/dev-env/activity/workflow-runs/',
  ])('matches %s to Activity', (pathname) => {
    expect(matchCopilotPage(pathname)).toBe(CopilotPageEnum.ACTIVITY);
  });

  it.each(['/env/dev-env/subscribers', '/env/dev-env/subscribers/create', '/env/dev-env/subscribers/sub_8f21'])(
    'matches %s to Subscribers',
    (pathname) => {
      expect(matchCopilotPage(pathname)).toBe(CopilotPageEnum.SUBSCRIBERS);
    }
  );

  it.each(['/integrations', '/integrations/connect', '/integrations/connect/sendgrid', '/integrations/int_123/update'])(
    'matches %s to Integrations',
    (pathname) => {
      expect(matchCopilotPage(pathname)).toBe(CopilotPageEnum.INTEGRATIONS);
    }
  );

  it.each(['/env/dev-env/analytics', '/env/dev-env/analytics/'])('matches %s to Usage', (pathname) => {
    expect(matchCopilotPage(pathname)).toBe(CopilotPageEnum.USAGE);
  });

  it.each([
    '/env/dev-env/workflows',
    '/env/dev-env/topics',
    '/env/dev-env/activity/unknown-tab',
    '/env/dev-env/workflows/welcome_wf_123/activity',
    '/env/dev-env/analytics/unknown-tab',
  ])('matches no page at %s', (pathname) => {
    expect(matchCopilotPage(pathname)).toBeUndefined();
  });
});

describe('resolveActiveCopilotPage', () => {
  it('returns the page when the flag lists it', () => {
    expect(resolveActiveCopilotPage('/env/dev-env/activity/workflow-runs', [CopilotPageEnum.ACTIVITY])).toBe(
      CopilotPageEnum.ACTIVITY
    );
  });

  it('returns nothing when the flag leaves the page out', () => {
    expect(
      resolveActiveCopilotPage('/env/dev-env/activity/workflow-runs', [CopilotPageEnum.SUBSCRIBERS])
    ).toBeUndefined();
  });

  it('never resolves inside the workflow editor, which mounts its own Copilot', () => {
    expect(
      resolveActiveCopilotPage('/env/dev-env/workflows/welcome_wf_123/activity', [CopilotPageEnum.ACTIVITY])
    ).toBeUndefined();
  });
});

function suggestionLabels(question?: string) {
  return getCopilotPanelCopy({ page: CopilotPageEnum.ACTIVITY, question }).suggestions.map(({ label }) => label);
}

describe('getCopilotPanelCopy', () => {
  it('returns the Activity copy, its suggestions led by the Activity icon, and a chip naming the page', () => {
    expect(getCopilotPanelCopy({ page: CopilotPageEnum.ACTIVITY })).toEqual({
      emptyState: {
        title: 'Ask about Activity',
        body: 'I read runs, steps and provider responses. Every answer names the environment it used.',
      },
      placeholder: 'Ask anything about Activity…',
      suggestions: [
        { label: 'Which runs failed in the last 24 hours?', icon: RiBarChart2Line },
        { label: 'Did my last trigger reach Novu?', icon: RiBarChart2Line },
        { label: 'Which workflows had errors today?', icon: RiBarChart2Line },
      ],
      chip: { label: 'Activity', icon: RiBarChartBoxLine },
    });
  });

  it('names Integrations in the chip and leads its suggestions with the plug icon', () => {
    const copy = getCopilotPanelCopy({ page: CopilotPageEnum.INTEGRATIONS });

    expect(copy.chip).toEqual({ label: 'Integrations', icon: RiStore3Line });
    expect(copy.suggestions.map(({ icon }) => icon)).toEqual([RiPlugLine, RiPlugLine, RiPlugLine]);
  });

  it('names Usage in the chip with its navigation icon, with suggestions the usage tool can answer', () => {
    const copy = getCopilotPanelCopy({ page: CopilotPageEnum.USAGE });

    expect(copy.chip).toEqual({ label: 'Usage', icon: RiLineChartLine });
    expect(copy.emptyState.title).toBe('Ask about usage');
    expect(copy.suggestions).toEqual([
      { label: 'How did email do in this period?', icon: RiBarChartGroupedLine },
      { label: 'Which workflows ran the most in this period?', icon: RiBarChartGroupedLine },
      { label: 'How many active subscribers did we have in this period?', icon: RiBarChartGroupedLine },
    ]);
  });

  it('names the open resource in the chip, still led by the page icon', () => {
    const copy = getCopilotPanelCopy({
      page: CopilotPageEnum.ACTIVITY,
      viewing: { resource: { type: CopilotViewingResourceEnum.REQUEST, id: 'req_1', label: 'POST /v1/events' } },
    });

    expect(copy.chip).toEqual({ label: 'POST /v1/events', icon: RiBarChartBoxLine });
  });

  it('leads the suggestions with the question about the open run, with the page icon', () => {
    expect(suggestionLabels('Why did this run fail?')).toEqual([
      'Why did this run fail?',
      'Which runs failed in the last 24 hours?',
      'Did my last trigger reach Novu?',
      'Which workflows had errors today?',
    ]);
    expect(
      getCopilotPanelCopy({ page: CopilotPageEnum.ACTIVITY, question: 'Why did this run fail?' }).suggestions[0]?.icon
    ).toBe(RiBarChart2Line);
  });

  it('does not repeat a question that is already a suggestion', () => {
    expect(suggestionLabels('Did my last trigger reach Novu?')).toEqual([
      'Did my last trigger reach Novu?',
      'Which runs failed in the last 24 hours?',
      'Which workflows had errors today?',
    ]);
  });

  it('leads the Subscribers suggestions with the question about the open subscriber, with the person icon', () => {
    expect(
      getCopilotPanelCopy({
        page: CopilotPageEnum.SUBSCRIBERS,
        question: 'Can this subscriber be reached on every channel?',
      })
    ).toEqual({
      emptyState: {
        title: 'Ask about subscribers',
        body: 'I check which channels can reach a subscriber and why not. Every answer names the environment it used.',
      },
      placeholder: 'Ask about a subscriber…',
      suggestions: [
        { label: 'Can this subscriber be reached on every channel?', icon: RiUser3Line },
        { label: 'Can we reach jane@acme.com on SMS?', icon: RiUser3Line },
        { label: "Why didn't user_123 get their last notification?", icon: RiUser3Line },
      ],
      chip: { label: 'Subscribers', icon: RiGroup2Line },
    });
  });

  it('shows the workflow editor its registered suggestions and a chip naming the workflow and step', () => {
    const suggestions = [{ label: 'Autocomplete this workflow', icon: RiBarChart2Line }];

    expect(
      getCopilotPanelCopy({ workflowId: 'wf_1', workflowLabel: 'welcome', stepLabel: 'email', suggestions })
    ).toEqual({
      emptyState: {
        title: 'Novu Copilot',
        body: 'Suggests improvements, fills gaps, and applies best practices as you build.',
      },
      placeholder: 'Ask anything about this page…',
      suggestions,
      chip: { label: 'welcome / email' },
    });
  });

  it('suggests nothing and shows no chip before a page registers, or on a page without an entry', () => {
    expect(getCopilotPanelCopy(undefined)).toMatchObject({ suggestions: [], chip: undefined });
    expect(getCopilotPanelCopy({ page: 'unknown' as CopilotPageEnum })).toMatchObject({
      suggestions: [],
      chip: undefined,
    });
  });
});

describe('getWorkflowRunQuestion', () => {
  it('asks why a failed run failed and to explain any other run', () => {
    expect(getWorkflowRunQuestion(true)).toBe('Why did this run fail?');
    expect(getWorkflowRunQuestion(false)).toBe('Explain this run');
  });
});
