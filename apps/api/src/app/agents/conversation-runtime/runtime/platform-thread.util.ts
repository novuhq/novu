import type { Thread } from 'chat';

export function applyPlatformThreadIdToThread(thread: Thread, platformThreadId: string): void {
  // Chat SDK currently gives top-level Slack DMs an empty-root thread id (`slack:D...:`).
  // Patch the in-memory handle before posting fallback replies so Slack receives a real thread root.
  (thread as unknown as { id: string }).id = platformThreadId;
}
