import { describe, expect, it } from 'vitest';
import { resolveCopilotMode } from './copilot-mode';

const settledWithoutReview = { isPending: false, isError: false, hasPendingChanges: false };

describe('resolveCopilotMode', () => {
  it('waits while LaunchDarkly may still serve the flags cached from the previous visit', () => {
    expect(resolveCopilotMode({ isFlagsReady: false, liveMode: 'legacy', legacyChat: settledWithoutReview })).toBe(
      null
    );
  });

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

  it('waits for the legacy chat lookup before choosing web chat', () => {
    expect(
      resolveCopilotMode({
        isFlagsReady: true,
        liveMode: 'web-chat-sidebar',
        legacyChat: { isPending: true, isError: false, hasPendingChanges: false },
      })
    ).toBe(null);
  });

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
