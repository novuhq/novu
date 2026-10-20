import { describe, expect, it } from 'vitest';
import { getHelpPage, WORKFLOW_EDITOR_PAGE } from './help-panel-content';
import { isChangelogUnread } from './use-whats-new-unread';

describe('getHelpPage', () => {
  it('matches the workflow editor before the workflows list', () => {
    expect(getHelpPage('/env/dev/workflows/onboarding/steps/email')).toBe(WORKFLOW_EDITOR_PAGE);
    expect(getHelpPage('/env/dev/workflows').context?.label).toBe('Workflows');
  });

  it('treats workflow creation and templates as the workflows page', () => {
    expect(getHelpPage('/env/dev/workflows/create').context?.label).toBe('Workflows');
    expect(getHelpPage('/env/dev/workflows/templates/abc').context?.label).toBe('Workflows');
  });

  it('prefers specific settings sub-pages over generic settings', () => {
    expect(getHelpPage('/settings/environments').context?.label).toBe('Environments');
    expect(getHelpPage('/settings/team').context?.label).toBe('Settings');
  });

  it('falls back to a page without context', () => {
    const page = getHelpPage('/env/dev/welcome');

    expect(page.context).toBeNull();
    expect(page.questions.length).toBeGreaterThan(0);
    expect(page.startHere.length).toBeGreaterThan(0);
  });
});

describe('isChangelogUnread', () => {
  const now = Date.parse('2026-10-20T12:00:00Z');

  it('is unread when published after the last visit and within 30 days', () => {
    expect(isChangelogUnread('2026-10-15T00:00:00Z', '2026-10-01T00:00:00Z', now)).toBe(true);
    expect(isChangelogUnread('2026-10-15T00:00:00Z', null, now)).toBe(true);
  });

  it('is read once seen after publishing', () => {
    expect(isChangelogUnread('2026-10-15T00:00:00Z', '2026-10-16T00:00:00Z', now)).toBe(false);
  });

  it('ignores posts older than 30 days and invalid dates', () => {
    expect(isChangelogUnread('2026-08-01T00:00:00Z', null, now)).toBe(false);
    expect(isChangelogUnread('not-a-date', null, now)).toBe(false);
  });
});
