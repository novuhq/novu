/**
 * Meta's WhatsApp Embedded Signup in the browser: the Facebook JS SDK, and the session event Meta posts
 * from its popup with the WhatsApp Business Account and number the operator picked. The same flow as the
 * Novu dashboard's button (`apps/dashboard/src/components/agents/whatsapp-embedded-signup-button.tsx`).
 */

const META_GRAPH_API_VERSION = 'v22.0';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const FACEBOOK_SDK_INIT_TIMEOUT_MS = 15_000;
/** How long one of Meta's two answers waits for the other before the attempt is given up. */
export const SIGNUP_PAIRING_TIMEOUT_MS = 30_000;

export type EmbeddedSignupSession = { wabaId: string; phoneNumberId: string };

/** A finished session, `waba_only` when Meta finished without a number, or `null` for any other message. */
export type EmbeddedSignupEvent = EmbeddedSignupSession | 'waba_only' | null;

export type FacebookLoginResponse = { authResponse?: { code?: string }; status?: string };

type FacebookSdk = {
  init: (params: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

let sdkLoading: Promise<FacebookSdk> | undefined;

/** Loads and initializes the SDK once per page, for the Meta app the API names. */
export function loadFacebookSdk(appId: string): Promise<FacebookSdk> {
  if (window.FB) {
    return Promise.resolve(window.FB);
  }

  sdkLoading ??= new Promise<FacebookSdk>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sdkLoading = undefined;
      reject(new Error('Facebook didn’t load. Refresh the page and try again.'));
    }, FACEBOOK_SDK_INIT_TIMEOUT_MS);

    window.fbAsyncInit = () => {
      window.FB?.init({ appId, version: META_GRAPH_API_VERSION, cookie: true, xfbml: false });
      clearTimeout(timeout);
      if (window.FB) {
        resolve(window.FB);
      }
    };

    if (document.getElementById('facebook-jssdk')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FACEBOOK_SDK_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      clearTimeout(timeout);
      sdkLoading = undefined;
      // Without this the next click finds the tag, skips the download and waits out the timeout.
      script.remove();
      reject(new Error('Facebook didn’t load. Check that nothing blocks facebook.com and try again.'));
    };
    document.body.appendChild(script);
  });

  return sdkLoading;
}

/** Only Meta's own pages may hand us a session: https on facebook.com or one of its subdomains. */
export function isTrustedFacebookOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();

  return url.protocol === 'https:' && (host === 'facebook.com' || host.endsWith('.facebook.com'));
}

/** Reads Meta's `WA_EMBEDDED_SIGNUP` message. Anything else, from anywhere else, is `null`. */
export function parseEmbeddedSignupEvent(event: Pick<MessageEvent, 'origin' | 'data'>): EmbeddedSignupEvent {
  if (!isTrustedFacebookOrigin(event.origin)) {
    return null;
  }

  let message: { type?: string; event?: string; data?: { waba_id?: string; phone_number_id?: string } };
  try {
    message = JSON.parse(String(event.data));
  } catch {
    return null;
  }

  if (message?.type !== 'WA_EMBEDDED_SIGNUP') {
    return null;
  }

  if (message.event === 'FINISH_ONLY_WABA') {
    return 'waba_only';
  }

  const wabaId = message.data?.waba_id?.trim();
  const phoneNumberId = message.data?.phone_number_id?.trim();

  return message.event === 'FINISH' && wabaId && phoneNumberId ? { wabaId, phoneNumberId } : null;
}

export type PairedSignup = EmbeddedSignupSession & { code: string };

/**
 * Meta answers a signup twice, in either order: `FB.login` with a code, and the `WA_EMBEDDED_SIGNUP` message
 * with the account and number. `onReady` runs once both are in; when one never follows the other within
 * `timeoutMs`, `onTimeout` runs instead, so the button never waits forever.
 */
export function createSignupPairing({
  onReady,
  onTimeout,
  timeoutMs = SIGNUP_PAIRING_TIMEOUT_MS,
}: {
  onReady: (signup: PairedSignup) => void;
  onTimeout: () => void;
  timeoutMs?: number;
}) {
  let code: string | undefined;
  let session: EmbeddedSignupSession | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const settle = () => {
    settled = true;
    clearTimeout(timer);
  };

  const arrived = () => {
    if (settled) {
      return;
    }

    if (code && session) {
      settle();
      onReady({ code, ...session });

      return;
    }

    timer ??= setTimeout(() => {
      if (!settled) {
        settle();
        onTimeout();
      }
    }, timeoutMs);
  };

  return {
    code(value: string) {
      code = value;
      arrived();
    },
    session(value: EmbeddedSignupSession) {
      session = value;
      arrived();
    },
    /** Stops waiting without either callback, for a cancelled or failed attempt. */
    cancel: settle,
  };
}

/** What `FB.login` is called with for Embedded Signup: a code to trade on the server, and the session event. */
export function embeddedSignupLoginOptions(configId: string): Record<string, unknown> {
  return {
    config_id: configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: { sessionInfoVersion: 3 },
  };
}
