'use client';

import { useAuth } from '@clerk/nextjs';
import mixpanel from 'mixpanel-browser';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Novu's Mixpanel project. Left empty, the dashboard sends nothing. Inlined at build time. */
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

/** Named like the API's Agent Inbox events (`AGENT_INBOX_EVENTS` in `@novu/shared`), so all of them filter alike. */
const PAGE_VIEWED = 'Page Viewed - [Agent Inbox]';

let started = false;

/**
 * Starts Mixpanel the first time it's needed, and says whether it runs. A link into the dashboard can carry a
 * one-time token in its query (a claim, a CLI login), so a full address is never sent: a page view has its
 * path, and where a visitor came from has its site only.
 */
function startMixpanel(): boolean {
  if (!MIXPANEL_TOKEN) {
    return false;
  }

  if (!started) {
    mixpanel.init(MIXPANEL_TOKEN, { save_referrer: false, property_blacklist: ['$current_url', '$referrer'] });
    started = true;
  }

  return true;
}

/**
 * Counts the operator's visits to the dashboard, one page view per page, on their own Mixpanel profile. They
 * are identified by the hidden Novu user behind their account, the id the API's Agent Inbox events carry, so
 * their visits and their agent's activity land on one profile. Nothing else about them is sent. Renders nothing.
 */
export function Analytics({ userId }: { userId: string | null }) {
  const pathname = usePathname();

  useEffect(() => {
    if (userId && startMixpanel() && mixpanel.get_distinct_id() !== userId) {
      mixpanel.identify(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (startMixpanel()) {
      mixpanel.track(PAGE_VIEWED, { path: pathname });
    }
  }, [pathname]);

  return null;
}

/**
 * Forgets the operator once nobody is signed in, so whoever uses this browser next starts out as someone new.
 * It sits on every account page: it runs as the operator signs out, or on the sign-in page at the latest,
 * before anyone else signs in. Renders nothing.
 */
export function ForgetSignedOutOperator() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn && startMixpanel() && mixpanel.get_property('$user_id')) {
      mixpanel.reset();
    }
  }, [isLoaded, isSignedIn]);

  return null;
}
