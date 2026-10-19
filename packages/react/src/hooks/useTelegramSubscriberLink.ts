import type {
  TelegramSubscriberLinkOptions,
  TelegramSubscriberLinkState,
  TelegramSubscriberLinkStatus,
} from '@novu/js';
import { TelegramSubscriberLink } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';

export type UseTelegramSubscriberLinkProps = TelegramSubscriberLinkOptions;

export type UseTelegramSubscriberLinkResult = {
  /** Current deep-link URL (`t.me/<bot>?start=<code>`), or `null` before the first issue. */
  deepLinkUrl: string | null;
  /** Telegram bot username (no `@`), or `null` before the first issue. */
  botUsername: string | null;
  /** Lifecycle status: `loading` while resolving initial state, `pending` while waiting for Start, `connected` once linked, `expired` briefly before auto-reissue. */
  status: TelegramSubscriberLinkStatus;
  /** Last error, if any. */
  error: Error | null;
  /** Re-issue a fresh deep link and restart polling. */
  refresh: () => Promise<void>;
};

/**
 * React hook wrapping {@link TelegramSubscriberLink} from `@novu/js`.
 *
 * Issues a Telegram subscriber-link deep link, polls for connection, and
 * re-issues automatically on code expiry. Returns reactive state that
 * updates as the lifecycle progresses.
 *
 * **Important:** The underlying API endpoint requires `INTEGRATION_WRITE` permission.
 * Either pass `secretKey` for direct server-side usage, or provide a custom
 * `fetchFn` / `apiUrl` that routes through your backend proxy.
 *
 * @example
 * ```tsx
 * import { useTelegramSubscriberLink } from '@novu/react';
 *
 * function TelegramConnect() {
 *   const { deepLinkUrl, botUsername, status, refresh } = useTelegramSubscriberLink({
 *     apiUrl: '/api/novu-proxy',
 *     integrationIdentifier: '<telegram-integration-identifier>',
 *     subscriberId: 'user-42',
 *   });
 *
 *   if (status === 'connected') return <p>Connected!</p>;
 *
 *   return (
 *     <div>
 *       {deepLinkUrl && <a href={deepLinkUrl}>Open @{botUsername} in Telegram</a>}
 *       <button onClick={refresh}>Refresh link</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTelegramSubscriberLink(props: UseTelegramSubscriberLinkProps): UseTelegramSubscriberLinkResult {
  const [state, setState] = useState<TelegramSubscriberLinkState>({
    status: 'loading',
    deepLinkUrl: null,
    botUsername: null,
    expiresAt: null,
    error: null,
  });

  const instanceRef = useRef<TelegramSubscriberLink | null>(null);

  const { apiUrl, secretKey, integrationIdentifier, subscriberId, pollIntervalMs, fetchFn } = props;

  // Keep the latest `fetchFn` in a ref so a new inline-function identity on every
  // render does not re-trigger the effect (which would tear down and re-issue the
  // link on a loop). The stable wrapper below reads from this ref.
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const stableFetchFn = useCallback<typeof fetch>((input, init) => {
    const fn = fetchFnRef.current ?? fetch;

    return fn(input, init);
  }, []);

  useEffect(() => {
    const link = new TelegramSubscriberLink({
      apiUrl,
      secretKey,
      integrationIdentifier,
      subscriberId,
      pollIntervalMs,
      fetchFn: stableFetchFn,
    });

    instanceRef.current = link;
    setState({ ...link.state });

    const unsubscribe = link.onStateChange((next) => {
      setState({ ...next });
    });

    void link.start();

    return () => {
      unsubscribe();
      link.stop();
      instanceRef.current = null;
    };
  }, [apiUrl, secretKey, integrationIdentifier, subscriberId, pollIntervalMs, stableFetchFn]);

  const refresh = useCallback(async () => {
    if (instanceRef.current) {
      await instanceRef.current.refresh();
    }
  }, []);

  return {
    deepLinkUrl: state.deepLinkUrl,
    botUsername: state.botUsername,
    status: state.status,
    error: state.error,
    refresh,
  };
}
