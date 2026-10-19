import { Accessor, createEffect, createMemo, createSignal, Setter } from 'solid-js';
import type { Novu } from '../../../novu';
import { NotificationFilter, Redirect } from '../../../types';
import { isValidInAppRedirectTarget, isValidInAppRedirectUrl } from '../../../utils/in-app-redirect-url';
import {
  NotificationStatus,
  type PreferenceGroups,
  type PreferencesFilter,
  type PreferencesSort,
  type RouterPush,
  type Tab,
} from '../../types';
import { createNovuEventEffect } from './events';

export type Navigate = (url?: string, target?: Redirect['target']) => void;

export type InboxStore = {
  setStatus: (status: NotificationStatus) => void;
  status: Accessor<NotificationStatus>;
  filter: Accessor<NotificationFilter>;
  limit: Accessor<number>;
  setLimit: (tab: number) => void;
  tabs: Accessor<Array<Tab>>;
  preferencesFilter: Accessor<PreferencesFilter | undefined>;
  preferenceGroups: Accessor<PreferenceGroups | undefined>;
  preferencesSort: Accessor<PreferencesSort | undefined>;
  activeTab: Accessor<string>;
  setActiveTab: (tab: string) => void;
  isOpened: Accessor<boolean>;
  setIsOpened: Setter<boolean>;
  navigate: Navigate;
  hideBranding: Accessor<boolean>;
  isDevelopmentMode: Accessor<boolean>;
  maxSnoozeDurationHours: Accessor<number>;
  isSnoozeEnabled: Accessor<boolean>;
  isKeyless: Accessor<boolean>;
  applicationIdentifier: Accessor<string | null>;
  contextKeys: Accessor<string[] | undefined>;
};

const DEFAULT_TARGET = '_blank';
const DEFAULT_REFERRER = 'noopener noreferrer';
const KEYLESS_APPLICATION_IDENTIFIER_PREFIX = 'pk_keyless_';

export const DEFAULT_LIMIT = 10;

const STATUS_TO_FILTER: Record<NotificationStatus, NotificationFilter> = {
  [NotificationStatus.UNREAD_READ]: { archived: false, snoozed: false },
  [NotificationStatus.UNREAD]: { read: false, snoozed: false },
  [NotificationStatus.ARCHIVED]: { archived: true },
  [NotificationStatus.SNOOZED]: { snoozed: true },
};

/**
 * In the next minor release we can remove the deprecated `value` field from the Tab type.
 * This function can be removed after that and the code should be updated to use the `filter` field.
 * @returns tags from the tab object
 */
export const getTagsFromTab = (tab?: Tab) => {
  return tab?.filter?.tags || tab?.value || [];
};

function isKeylessApplicationIdentifier(applicationIdentifier: string | null | undefined): boolean {
  return !!applicationIdentifier?.startsWith(KEYLESS_APPLICATION_IDENTIFIER_PREFIX);
}

/** Opens absolute urls in a new window and hands relative ones to the host router, or falls back to `pushState`. */
export const createNavigate = (routerPush: Accessor<RouterPush | undefined>): Navigate => {
  return (url, target) => {
    if (!url || !isValidInAppRedirectUrl(url)) {
      return;
    }

    const isAbsoluteUrl = !url.startsWith('/');
    if (isAbsoluteUrl) {
      const safeTarget = isValidInAppRedirectTarget(target) ? target : DEFAULT_TARGET;
      window.open(url, safeTarget, DEFAULT_REFERRER);

      return;
    }

    const push = routerPush();
    if (push) {
      push(url);

      return;
    }

    const fullUrl = new URL(url, window.location.href);
    const pushState = window.history.pushState.bind(window.history);
    pushState({}, '', fullUrl);
  };
};

type CreateInboxStoreArgs = {
  novu: Accessor<Novu>;
  tabs: Accessor<Array<Tab>>;
  preferencesFilter: Accessor<PreferencesFilter | undefined>;
  preferenceGroups: Accessor<PreferenceGroups | undefined>;
  preferencesSort: Accessor<PreferencesSort | undefined>;
  routerPush: Accessor<RouterPush | undefined>;
  applicationIdentifier: Accessor<string | undefined>;
};

/**
 * The Inbox's shared view state: which list is shown (status, tab, filter), whether the popover is open, and
 * the flags the session hands back (branding, development mode, snooze limits, keyless identifier).
 */
export const createInboxStore = (args: CreateInboxStoreArgs): InboxStore => {
  const initialTabs = args.tabs();
  const [isOpened, setIsOpened] = createSignal<boolean>(false);
  const [tabs, setTabs] = createSignal<Array<Tab>>(initialTabs);
  const [activeTab, setActiveTab] = createSignal<string>(initialTabs[0]?.label ?? '');
  const [status, setStatus] = createSignal<NotificationStatus>(NotificationStatus.UNREAD_READ);
  const [limit, setLimit] = createSignal<number>(DEFAULT_LIMIT);
  const [filter, setFilter] = createSignal<NotificationFilter>({
    ...STATUS_TO_FILTER[NotificationStatus.UNREAD_READ],
    tags: initialTabs.length > 0 ? getTagsFromTab(initialTabs[0]) : [],
    data: initialTabs.length > 0 ? initialTabs[0].filter?.data : {},
    severity: initialTabs.length > 0 ? initialTabs[0].filter?.severity : undefined,
  });
  const [hideBranding, setHideBranding] = createSignal(false);
  const [isDevelopmentMode, setIsDevelopmentMode] = createSignal(false);
  const [maxSnoozeDurationHours, setMaxSnoozeDurationHours] = createSignal(0);
  const isSnoozeEnabled = createMemo(() => maxSnoozeDurationHours() > 0);
  const [preferencesFilter, setPreferencesFilter] = createSignal<PreferencesFilter | undefined>(
    args.preferencesFilter()
  );
  const [isKeyless, setIsKeyless] = createSignal(false);
  const [applicationIdentifier, setApplicationIdentifier] = createSignal<string | null>(null);
  const [contextKeys, setContextKeys] = createSignal<string[] | undefined>(undefined);
  const [preferenceGroups, setPreferenceGroups] = createSignal<PreferenceGroups | undefined>(args.preferenceGroups());
  const [preferencesSort, setPreferencesSort] = createSignal<PreferencesSort | undefined>(args.preferencesSort());

  const setNewStatus = (newStatus: NotificationStatus) => {
    setStatus(newStatus);
    setFilter((old) => ({ ...STATUS_TO_FILTER[newStatus], tags: old.tags, data: old.data, severity: old.severity }));
  };

  const setNewActiveTab = (newActiveTab: string) => {
    const tab = tabs().find((tab) => tab.label === newActiveTab);
    const tags = getTagsFromTab(tab);
    if (!tags) {
      return;
    }

    setActiveTab(newActiveTab);
    setFilter((old) => ({ ...old, tags, data: tab?.filter?.data, severity: tab?.filter?.severity }));
  };

  const navigate = createNavigate(args.routerPush);

  createEffect(() => {
    const nextTabs = args.tabs();
    setTabs(nextTabs);
    const firstTab = nextTabs[0];
    const tags = getTagsFromTab(firstTab);
    setActiveTab(firstTab?.label ?? '');
    setFilter((old) => ({ ...old, tags, data: firstTab?.filter?.data, severity: firstTab?.filter?.severity }));

    setPreferencesFilter(args.preferencesFilter());
    setPreferenceGroups(args.preferenceGroups());
  });

  createEffect(() => {
    setPreferencesSort(() => args.preferencesSort());
  });

  createNovuEventEffect(args.novu, 'session.initialize.resolved', ({ data }) => {
    if (!data) {
      return;
    }
    const storedKeylessIdentifier = window.localStorage.getItem('novu_keyless_application_identifier');

    setHideBranding(data.removeNovuBranding);
    setIsDevelopmentMode(data.isDevelopmentMode);
    setMaxSnoozeDurationHours(data.maxSnoozeDurationHours);
    setContextKeys(data.contextKeys);

    const configuredIdentifier = args.applicationIdentifier();
    if (!configuredIdentifier) {
      const keylessActive =
        isKeylessApplicationIdentifier(data.applicationIdentifier) ||
        isKeylessApplicationIdentifier(storedKeylessIdentifier);

      setIsKeyless(keylessActive);
      setApplicationIdentifier(data.applicationIdentifier ?? null);
    } else {
      setIsKeyless(false);
      setApplicationIdentifier(configuredIdentifier);
    }
  });

  return {
    status,
    setStatus: setNewStatus,
    filter,
    tabs,
    activeTab,
    setActiveTab: setNewActiveTab,
    limit,
    setLimit,
    isOpened,
    setIsOpened,
    navigate,
    hideBranding,
    preferencesFilter,
    preferenceGroups,
    preferencesSort,
    isDevelopmentMode,
    maxSnoozeDurationHours,
    isSnoozeEnabled,
    isKeyless,
    applicationIdentifier,
    contextKeys,
  };
};
