import { useCallback, useEffect, useRef, useState } from 'react';
import { RiLoader4Line } from 'react-icons/ri';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { NOVU_WHATSAPP_APP_ID, NOVU_WHATSAPP_CONFIG_ID } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useWhatsAppEmbeddedSignup } from '@/hooks/use-whatsapp-embedded-signup';
import { cn } from '@/utils/ui';

const META_GRAPH_API_VERSION = 'v22.0';
const FACEBOOK_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';
const META_FACEBOOK_LOGIN_BLUE = '#1877F2';

type EmbeddedSignupSession = {
  wabaId: string;
  phoneNumberId: string;
};

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

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

let facebookSdkLoadPromise: Promise<void> | undefined;

function loadFacebookSdk(appId: string): Promise<void> {
  if (window.FB) {
    return Promise.resolve();
  }

  if (facebookSdkLoadPromise) {
    return facebookSdkLoadPromise;
  }

  facebookSdkLoadPromise = new Promise<void>((resolve, reject) => {
    // Always set fbAsyncInit so we handle the case where the script tag already
    // exists but FB.init hasn't fired yet (e.g. navigating back to the page).
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        version: META_GRAPH_API_VERSION,
        cookie: true,
        xfbml: false,
      });
      resolve();
    };

    const existingScript = document.getElementById('facebook-jssdk');
    if (existingScript) {
      // Script injected previously — if FB is ready resolve immediately,
      // otherwise fbAsyncInit above will resolve when it fires.
      if (window.FB) {
        resolve();
      }

      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = FACEBOOK_SDK_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      facebookSdkLoadPromise = undefined;
      reject(new Error('Failed to load the Facebook SDK.'));
    };
    document.body.appendChild(script);
  });

  return facebookSdkLoadPromise;
}

function parseEmbeddedSignupEvent(event: MessageEvent): EmbeddedSignupSession | null {
  if (!event.origin.endsWith('facebook.com')) {
    return null;
  }

  try {
    const data = JSON.parse(String(event.data)) as {
      type?: string;
      event?: string;
      data?: { waba_id?: string; phone_number_id?: string };
    };

    if (data.type !== 'WA_EMBEDDED_SIGNUP') {
      return null;
    }

    if (data.event !== 'FINISH' && data.event !== 'FINISH_ONLY_WABA') {
      return null;
    }

    const wabaId = data.data?.waba_id?.trim();
    const phoneNumberId = data.data?.phone_number_id?.trim();

    if (!wabaId || !phoneNumberId) {
      return null;
    }

    return { wabaId, phoneNumberId };
  } catch {
    return null;
  }
}

function MetaFacebookLoginIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={cn('size-4 shrink-0', className)}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

type MetaFacebookLoginButtonProps = {
  isLoading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function MetaFacebookLoginButton({ isLoading, disabled, onClick }: MetaFacebookLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex h-8 w-fit cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3',
        'border-0 text-label-xs font-semibold leading-none text-white',
        'font-[Helvetica,Arial,sans-serif]',
        'transition-opacity duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]/40 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60'
      )}
      style={{ backgroundColor: META_FACEBOOK_LOGIN_BLUE }}
    >
      {isLoading ? (
        <>
          <RiLoader4Line className="size-4 shrink-0 animate-spin" aria-hidden />
          <span>Logging in…</span>
        </>
      ) : (
        <>
          <MetaFacebookLoginIcon />
          <span>Log in with Facebook</span>
        </>
      )}
    </button>
  );
}

export type WhatsAppEmbeddedSignupButtonProps = {
  agentIdentifier: string;
  integrationIdentifier: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export function WhatsAppEmbeddedSignupButton({
  agentIdentifier,
  integrationIdentifier,
  disabled = false,
  onSuccess,
  onError,
}: WhatsAppEmbeddedSignupButtonProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const pendingSessionRef = useRef<EmbeddedSignupSession | null>(null);
  const pendingCodeRef = useRef<string | null>(null);
  const messageListenerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const { refetch: refetchIntegrations } = useFetchIntegrations();
  const { mutateAsync: completeEmbeddedSignup } = useWhatsAppEmbeddedSignup();

  const cleanupMessageListener = useCallback(() => {
    if (messageListenerRef.current) {
      window.removeEventListener('message', messageListenerRef.current);
      messageListenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupMessageListener();
    };
  }, [cleanupMessageListener]);

  const submitEmbeddedSignup = useCallback(async () => {
    const session = pendingSessionRef.current;
    const code = pendingCodeRef.current;

    if (!session || !code) {
      return;
    }

    pendingSessionRef.current = null;
    pendingCodeRef.current = null;
    cleanupMessageListener();

    try {
      const result = await completeEmbeddedSignup({
        code,
        wabaId: session.wabaId,
        phoneNumberId: session.phoneNumberId,
        integrationIdentifier,
        agentIdentifier,
      });

      if (!result.success) {
        const message = result.error?.message ?? 'WhatsApp Embedded Signup did not complete successfully.';
        showErrorToast(message);
        onError?.(message);

        return;
      }

      await refetchIntegrations();

      if (result.phoneRegistrationWarning) {
        showErrorToast(result.phoneRegistrationWarning);
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong completing WhatsApp Embedded Signup.';
      showErrorToast(message);
      onError?.(message);
    } finally {
      setIsLaunching(false);
    }
  }, [
    agentIdentifier,
    cleanupMessageListener,
    completeEmbeddedSignup,
    integrationIdentifier,
    onError,
    onSuccess,
    refetchIntegrations,
  ]);

  const tryCompleteSignup = useCallback(() => {
    if (pendingSessionRef.current && pendingCodeRef.current) {
      void submitEmbeddedSignup();
    }
  }, [submitEmbeddedSignup]);

  const handleConnect = useCallback(async () => {
    if (!NOVU_WHATSAPP_APP_ID || !NOVU_WHATSAPP_CONFIG_ID) {
      const message = 'WhatsApp Embedded Signup is not configured for this deployment.';
      showErrorToast(message);
      onError?.(message);

      return;
    }

    if (!integrationIdentifier) {
      const message = 'Select a WhatsApp integration before connecting.';
      showErrorToast(message);
      onError?.(message);

      return;
    }

    setIsLaunching(true);
    pendingSessionRef.current = null;
    pendingCodeRef.current = null;
    cleanupMessageListener();

    try {
      await loadFacebookSdk(NOVU_WHATSAPP_APP_ID);

      const listener = (event: MessageEvent) => {
        const session = parseEmbeddedSignupEvent(event);
        if (!session) {
          return;
        }

        pendingSessionRef.current = session;
        tryCompleteSignup();
      };

      messageListenerRef.current = listener;
      window.addEventListener('message', listener);

      window.FB?.login(
        (response) => {
          if (response.authResponse?.code) {
            pendingCodeRef.current = response.authResponse.code;
            tryCompleteSignup();

            return;
          }

          cleanupMessageListener();
          setIsLaunching(false);

          if (response.status !== 'unknown') {
            const message = 'WhatsApp signup was cancelled before completion.';
            showErrorToast(message);
            onError?.(message);
          }
        },
        {
          config_id: NOVU_WHATSAPP_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            sessionInfoVersion: 3,
          },
        }
      );
    } catch (err) {
      cleanupMessageListener();
      setIsLaunching(false);
      const message = err instanceof Error ? err.message : 'Failed to launch WhatsApp Embedded Signup.';
      showErrorToast(message);
      onError?.(message);
    }
  }, [cleanupMessageListener, integrationIdentifier, onError, tryCompleteSignup]);

  return (
    <MetaFacebookLoginButton
      isLoading={isLaunching}
      disabled={disabled || !integrationIdentifier}
      onClick={() => {
        void handleConnect();
      }}
    />
  );
}
