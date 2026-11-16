import { describe, expect, it } from 'vitest';
import { getCopilotSurface, isPendingCopilotMode, resolveCopilotMode } from './copilot-mode';

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
