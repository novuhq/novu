import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { fetchSanity } from '@/utils/sanity';

const SEEN_AT_STORAGE_KEY = 'novu:help-panel:whats-new-seen-at';
const UNREAD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const LATEST_CHANGELOG_QUERY = `*[_type == "changelogPost" && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc)[0].publishedAt`;

function readSeenAt(): string | null {
  try {
    return window.localStorage.getItem(SEEN_AT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSeenAt(value: string): void {
  try {
    window.localStorage.setItem(SEEN_AT_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode, quota); the dot simply stays visible.
  }
}

export function isChangelogUnread(publishedAt: string, seenAt: string | null, now = Date.now()): boolean {
  const publishedTime = new Date(publishedAt).getTime();
  const seenTime = seenAt ? new Date(seenAt).getTime() : 0;

  return publishedTime > seenTime && now - publishedTime <= UNREAD_WINDOW_MS;
}

export function useWhatsNewUnread() {
  const [seenAt, setSeenAt] = useState(readSeenAt);

  const { data: latestPublishedAt } = useQuery({
    queryKey: ['changelogs', 'latest-published-at'],
    queryFn: () => fetchSanity<string | null>(LATEST_CHANGELOG_QUERY),
    staleTime: 60 * 60 * 1000,
    retry: false,
    meta: { showError: false },
  });

  const markAsSeen = useCallback(() => {
    const now = new Date().toISOString();
    writeSeenAt(now);
    setSeenAt(now);
  }, []);

  return {
    hasUnread: latestPublishedAt ? isChangelogUnread(latestPublishedAt, seenAt) : false,
    markAsSeen,
  };
}
