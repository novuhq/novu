'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getApiToken, subscribeApiToken } from './api-token';

/** Mirrors `WebChatConversationMetadataDto` on the API. */
export type ConversationSummary = {
  identifier: string;
  title: string;
  status: string;
  agentIdentifier: string;
  lastActivityAt: string;
  createdAt: string;
};

const RECENT_LIMIT = 5;

async function fetchConversations(backendUrl: string, token: string): Promise<ConversationSummary[]> {
  const url = new URL(`${backendUrl.replace(/\/+$/, '')}/v1/web-chat/conversations`);
  url.searchParams.set('limit', String(RECENT_LIMIT));
  url.searchParams.set('orderBy', 'lastActivityAt');
  url.searchParams.set('orderDirection', 'DESC');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`list conversations failed: ${response.status}`);
  }

  const body = (await response.json()) as { data?: ConversationSummary[] };

  return body.data ?? [];
}

/**
 * The token arrives asynchronously from session init, so the list subscribes to it
 * rather than reading once on mount.
 */
export function useConversations(backendUrl: string) {
  const token = useSyncExternalStore(subscribeApiToken, getApiToken, () => undefined);
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      setItems(await fetchConversations(backendUrl, token));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, isLoading, error, reload };
}

export function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}
