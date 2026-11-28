import { describe, expect, it } from 'vitest';
import { advanceVisitCopilotMode, getCopilotSurface, isPendingCopilotMode, resolveCopilotMode } from './copilot-mode';

const settledWithoutReview = { isPending: false, isError: false, hasPendingChanges: false };

describe('resolveCopilotMode', () => {
  it.each(['legacy', 'web-chat-sidebar', 'web-chat-popover'] as const)(
    'predicts %s from the cached flags until the feature flags are ready',
    (liveMode) => {
      expect(resolveCopilotMode({ isFlagsReady: false, liveMode, legacyChat: settledWithoutReview })).toBe(
        `pending-${liveMode}`
      );
    }
  );

  it('uses the legacy sidebar when the flags ask for it', () => {
    expect(resolveCopilotMode({ isFlagsReady: true, liveMode: 'legacy', legacyChat: settledWithoutReview })).toBe(
      'legacy'
    );
  });

  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'uses %s when the workflow has no legacy changes to review',
    (liveMode) => {
      expect(resolveCopilotMode({ isFlagsReady: true, liveMode, legacyChat: settledWithoutReview })).toBe(liveMode);
    }
  );

  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'predicts %s while the legacy chat lookup is pending',
    (liveMode) => {
      expect(
        resolveCopilotMode({
          isFlagsReady: true,
          liveMode,
          legacyChat: { isPending: true, isError: false, hasPendingChanges: false },
        })
      ).toBe(`pending-${liveMode}`);
    }
  );

  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'keeps the legacy sidebar instead of %s until its unreviewed changes are kept or discarded',
    (liveMode) => {
      expect(
        resolveCopilotMode({
          isFlagsReady: true,
          liveMode,
          legacyChat: { isPending: false, isError: false, hasPendingChanges: true },
        })
      ).toBe('legacy');
    }
  );

  it('treats a failed legacy chat lookup as nothing to review, even over a cached chat', () => {
    expect(
      resolveCopilotMode({
        isFlagsReady: true,
        liveMode: 'web-chat-popover',
        legacyChat: { isPending: false, isError: true, hasPendingChanges: true },
      })
    ).toBe('web-chat-popover');
  });
});

describe('advanceVisitCopilotMode', () => {
  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'starts a first visit on %s without awaiting a review when nothing is held',
    (liveMode) => {
      expect(advanceVisitCopilotMode(undefined, liveMode, liveMode)).toEqual({
        mode: liveMode,
        isAwaitingLegacyReview: false,
      });
    }
  );

  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'marks a legacy visit as awaiting its review when the flags ask for %s',
    (liveMode) => {
      expect(advanceVisitCopilotMode(undefined, 'legacy', liveMode)).toEqual({
        mode: 'legacy',
        isAwaitingLegacyReview: true,
      });
    }
  );

  it('does not mark a legacy visit as awaiting a review when the flags ask for legacy', () => {
    expect(advanceVisitCopilotMode(undefined, 'legacy', 'legacy')).toEqual({
      mode: 'legacy',
      isAwaitingLegacyReview: false,
    });
  });

  it.each(['web-chat-sidebar', 'web-chat-popover'] as const)(
    'moves a visit awaiting its review to %s once the review is done',
    (liveMode) => {
      expect(advanceVisitCopilotMode({ mode: 'legacy', isAwaitingLegacyReview: true }, liveMode, liveMode)).toEqual({
        mode: liveMode,
        isAwaitingLegacyReview: false,
      });
    }
  );

  it('keeps a visit on the legacy sidebar while its review is still open', () => {
    const awaiting = { mode: 'legacy', isAwaitingLegacyReview: true } as const;

    expect(advanceVisitCopilotMode(awaiting, 'legacy', 'web-chat-sidebar')).toBe(awaiting);
  });

  it('never moves a flag-driven legacy visit mid-visit, so a running generation is not stopped', () => {
    const legacyVisit = { mode: 'legacy', isAwaitingLegacyReview: false } as const;

    expect(advanceVisitCopilotMode(legacyVisit, 'web-chat-sidebar', 'web-chat-sidebar')).toBe(legacyVisit);
  });

  it('keeps a web-chat visit on its mode when the flags change mid-visit', () => {
    const webChatVisit = { mode: 'web-chat-sidebar', isAwaitingLegacyReview: false } as const;

    expect(advanceVisitCopilotMode(webChatVisit, 'web-chat-popover', 'web-chat-popover')).toBe(webChatVisit);
  });
});

describe('isPendingCopilotMode', () => {
  it.each(['pending-legacy', 'pending-web-chat-sidebar', 'pending-web-chat-popover'] as const)(
    'reports %s as not resolved yet',
    (mode) => {
      expect(isPendingCopilotMode(mode)).toBe(true);
    }
  );

  it.each(['legacy', 'web-chat-sidebar', 'web-chat-popover'] as const)('reports %s as resolved', (mode) => {
    expect(isPendingCopilotMode(mode)).toBe(false);
  });
});

describe('getCopilotSurface', () => {
  it('shows web chat in the sidebar or the popover once the visit resolved to it', () => {
    expect(getCopilotSurface('web-chat-sidebar')).toBe('sidebar');
    expect(getCopilotSurface('web-chat-popover')).toBe('popover');
  });

  it.each(['legacy', 'pending-legacy', 'pending-web-chat-sidebar', 'pending-web-chat-popover', null] as const)(
    'has no web-chat surface for %s',
    (mode) => {
      expect(getCopilotSurface(mode)).toBe(null);
    }
  );
});
