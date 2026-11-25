import { CopilotPageEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import {
  getCopilotPageCopy,
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

  it.each([
    '/env/dev-env/workflows',
    '/env/dev-env/topics',
    '/env/dev-env/activity/unknown-tab',
    '/env/dev-env/workflows/welcome_wf_123/activity',
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

describe('getCopilotPageCopy', () => {
  it('returns the Activity copy and suggestions', () => {
    expect(getCopilotPageCopy(CopilotPageEnum.ACTIVITY)).toEqual({
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
    });
  });

  it('leads the suggestions with the question about the open run', () => {
    expect(getCopilotPageCopy(CopilotPageEnum.ACTIVITY, 'Why did this run fail?')?.suggestions).toEqual([
      'Why did this run fail?',
      'Which runs failed in the last 24 hours?',
      'Did my last trigger reach Novu?',
      'Which workflows had errors today?',
    ]);
  });

  it('does not repeat a question that is already a suggestion', () => {
    expect(getCopilotPageCopy(CopilotPageEnum.ACTIVITY, 'Did my last trigger reach Novu?')?.suggestions).toEqual([
      'Did my last trigger reach Novu?',
      'Which runs failed in the last 24 hours?',
      'Which workflows had errors today?',
    ]);
  });

  it('leads the Subscribers suggestions with the question about the open subscriber', () => {
    expect(getCopilotPageCopy(CopilotPageEnum.SUBSCRIBERS, 'Can this subscriber be reached on every channel?')).toEqual(
      {
        emptyState: {
          title: 'Ask about subscribers',
          body: 'I check which channels can reach a subscriber and why not. Every answer names the environment it used.',
        },
        placeholder: 'Ask about a subscriber…',
        suggestions: [
          'Can this subscriber be reached on every channel?',
          'Can we reach jane@acme.com on SMS?',
          "Why didn't user_123 get their last notification?",
        ],
      }
    );
  });

  it('returns nothing for a page without an entry', () => {
    expect(getCopilotPageCopy('unknown' as CopilotPageEnum)).toBeUndefined();
  });
});

describe('getWorkflowRunQuestion', () => {
  it('asks why a failed run failed and to explain any other run', () => {
    expect(getWorkflowRunQuestion(true)).toBe('Why did this run fail?');
    expect(getWorkflowRunQuestion(false)).toBe('Explain this run');
  });
});
