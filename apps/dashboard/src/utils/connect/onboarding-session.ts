export const CONNECT_PROVISIONING_KEY = 'novu.connect.provisioning';
export const CONNECT_PROVISION_QUERY = 'provision';

const PROVISIONING_CHANGE_EVENT = 'novu.connect.provisioning-change';

export function notifyConnectProvisioningChange(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(PROVISIONING_CHANGE_EVENT));
}

export function subscribeConnectProvisioningChange(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(PROVISIONING_CHANGE_EVENT, listener);

  return () => window.removeEventListener(PROVISIONING_CHANGE_EVENT, listener);
}

export function beginConnectProvisioning(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CONNECT_PROVISIONING_KEY, '1');
    notifyConnectProvisioningChange();
  } catch {
    // sessionStorage unavailable
  }
}

export function isConnectProvisioningActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(CONNECT_PROVISIONING_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearConnectProvisioning(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CONNECT_PROVISIONING_KEY);
    notifyConnectProvisioningChange();
  } catch {
    // sessionStorage unavailable
  }
}

export function buildConnectProvisionOrgListPath(orgListPath: string): string {
  const url = new URL(orgListPath, 'http://local');
  url.searchParams.set(CONNECT_PROVISION_QUERY, '1');

  return `${url.pathname}${url.search}`;
}

// Appends `?provision=1` to a relative path or absolute URL so the intent survives a
// cross-origin handoff (sessionStorage is per-origin and not visible to the destination).
export function withConnectProvisioningIntent(href: string): string {
  if (!href) return href;

  try {
    const isAbsolute = /^https?:\/\//i.test(href);
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(href, fallbackBase);
    url.searchParams.set(CONNECT_PROVISION_QUERY, '1');

    if (isAbsolute) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function consumeConnectProvisionIntentFromLocation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get(CONNECT_PROVISION_QUERY) !== '1') {
    return false;
  }

  beginConnectProvisioning();
  params.delete(CONNECT_PROVISION_QUERY);
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);

  return true;
}
