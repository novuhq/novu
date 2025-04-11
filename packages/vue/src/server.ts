import { App, provide, ref } from 'vue';
import { Novu } from '@novu/js';
import { NovuKey, NovuProviderProps } from './context/NovuProviderContext.js';
import { UseCountsProps, UseCountsResult } from './hooks/useCounts.js';
import { UseNotificationsProps, UseNotificationsResult } from './hooks/useNotifications.js';
import { UsePreferencesProps, UsePreferencesResult } from './hooks/usePreferences.js';

/**
 * Exporting all components from the components folder
 * as empty functions to fix build errors in SSR
 * This will be replaced with actual components
 * when we implement the SSR components in @novu/js/ui
 */
export function Inbox() {}
export function InboxContent() {}
export function Notifications() {}
export function Preferences() {}
export function Bell() {}

export function NovuProvider(props: NovuProviderProps) {}

export function useNovu() {
  return null;
}

export function useCounts(_: UseCountsProps): UseCountsResult {
  return {
    counts: ref(undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFetching: ref(false),
    refetch: () => Promise.resolve(),
  };
}

export function useNotifications(_: UseNotificationsProps): UseNotificationsResult {
  return {
    notifications: ref(undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFetching: ref(false),
    hasMore: ref(false),
    readAll: () => Promise.resolve({ data: undefined, error: undefined }),
    archiveAll: () => Promise.resolve({ data: undefined, error: undefined }),
    archiveAllRead: () => Promise.resolve({ data: undefined, error: undefined }),
    refetch: () => Promise.resolve(),
    fetchMore: () => Promise.resolve(),
  };
}

export function usePreferences(_: UsePreferencesProps): UsePreferencesResult {
  return {
    preferences: ref(undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFetching: ref(false),
    refetch: () => Promise.resolve(),
  };
}

// @ts-ignore
const version = PACKAGE_VERSION;
// @ts-ignore
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

// Optional: Global install function
export default {
  install(app: App, options?: NovuProviderProps) {
    app.component('Inbox', Inbox);
    app.component('InboxContent', InboxContent);
    app.component('Notifications', Notifications);
    app.component('Preferences', Preferences);
    app.component('Bell', Bell);
    app.component('NovuProvider', NovuProvider);

    if (options)
      provide(
        NovuKey,
        ref(
          new Novu({
            applicationIdentifier: options.applicationIdentifier,
            subscriberId: options.subscriberId,
            subscriberHash: options.subscriberHash,
            backendUrl: options.backendUrl,
            socketUrl: options.socketUrl,
            useCache: options.useCache,
            __userAgent: `${baseUserAgent} ${options.userAgentType}`,
          })
        )
      );
  },
};
