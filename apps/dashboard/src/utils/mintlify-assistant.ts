import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { IS_AI_FEATURES_ENABLED } from '@/config';

const MINTLIFY_WIDGET_ID = 'mint_widget_9890b2a3-6a4f-4516-8331-24a3b12e6162';
/**
 * Pin an immutable Mintlify widget build (not floating /v1/embed.js).
 * Bump by reading https://widget.mintlify.com/v1/manifest.json, then refresh
 * MINTLIFY_EMBED_INTEGRITY with: openssl dgst -sha384 -binary embed.js | openssl base64 -A
 */
const MINTLIFY_EMBED_VERSION = '0.0.61';
const MINTLIFY_EMBED_URL = `https://widget.mintlify.com/versions/${MINTLIFY_EMBED_VERSION}/embed.js`;
const MINTLIFY_EMBED_INTEGRITY = 'sha384-bSqvMIpnn7junQOtOOcmXzbErlvtTW6+lG3TXYc5L/aEISuuwVTmW0kH+3Tw7urd';
const MINTLIFY_SCRIPT_ID = 'mintlify-assistant-embed';
const HIDE_TRIGGER_STYLE_ID = 'novu-hide-mintlify-trigger';
const HIDE_TRIGGER_CSS = `
  [data-mintlify-assistant-trigger] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

const APPEARANCE = {
  variant: 'panel' as const,
  theme: 'light' as const,
  accent: '#DD2476',
  radius: '16px',
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  dismissOnInteractOutside: true,
  zIndex: 60,
  logo: {
    light: 'https://docs.novu.co/logo/light.svg',
    dark: 'https://docs.novu.co/logo/dark.svg',
  },
};

const LABELS = {
  title: 'Ask AI',
  placeholder: "Type away… we're all ears.",
  suggestions: 'Suggestions',
  disclaimer: false as const,
};

const STARTER_QUESTIONS = [
  'how to connect Langchain agent to slack using Novu Connect?',
  'how to use Novu Inbox?',
  'how to personalize the notification content?',
];

type MintlifyAssistantConfig = {
  id: string;
  defaultOpen?: boolean;
  appearance?: typeof APPEARANCE;
  labels?: typeof LABELS;
  starterQuestions?: string[];
};

type MintlifyAssistantApi = {
  init: (config: MintlifyAssistantConfig) => Promise<void>;
  update: (config: Omit<MintlifyAssistantConfig, 'id'> & { id?: never }) => Promise<void>;
  open: (options?: { source: string; focus?: boolean }) => Promise<void>;
  ask: (question: string, options?: { source: string; open?: boolean; focus?: boolean }) => Promise<void>;
};

declare global {
  interface Window {
    MintlifyAssistant?: MintlifyAssistantApi;
  }
}

let initPromise: Promise<MintlifyAssistantApi> | undefined;
let triggerHiderInstalled = false;

function hideTriggerInShadow(root: ShadowRoot): void {
  if (root.getElementById(HIDE_TRIGGER_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = HIDE_TRIGGER_STYLE_ID;
  style.textContent = HIDE_TRIGGER_CSS;
  root.appendChild(style);
}

/**
 * Mintlify paints "Ask assistant" inside a closed shadow root, and its own
 * :host styles beat any page rule — including display:none !important on the host.
 * Capture the shadow root as it is created and hide only the launcher there.
 */
function installMintlifyTriggerHider(): void {
  if (triggerHiderInstalled) {
    return;
  }

  triggerHiderInstalled = true;
  const originalAttachShadow = Element.prototype.attachShadow;

  Element.prototype.attachShadow = function attachShadow(init: ShadowRootInit): ShadowRoot {
    const root = originalAttachShadow.call(this, init);

    if (this.localName !== 'mintlify-assistant') {
      return root;
    }

    hideTriggerInShadow(root);

    const observer = new MutationObserver(() => {
      hideTriggerInShadow(root);
    });
    observer.observe(root, { childList: true });

    return root;
  };
}

function waitForMintlifyAssistant(timeoutMs = 10_000): Promise<MintlifyAssistantApi> {
  if (window.MintlifyAssistant) {
    return Promise.resolve(window.MintlifyAssistant);
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      if (window.MintlifyAssistant) {
        window.clearInterval(intervalId);
        resolve(window.MintlifyAssistant);

        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(intervalId);
        reject(new Error('Timed out waiting for MintlifyAssistant to load.'));
      }
    }, 50);
  });
}

function removeEmbedScript(): void {
  document.getElementById(MINTLIFY_SCRIPT_ID)?.remove();
}

async function loadEmbedScript(): Promise<MintlifyAssistantApi> {
  if (window.MintlifyAssistant) {
    return window.MintlifyAssistant;
  }

  // A previous attempt may have left a script that loaded without registering
  // the assistant. Waiting on that element can never succeed, so replace it.
  removeEmbedScript();

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = MINTLIFY_SCRIPT_ID;
    script.type = 'module';
    // crossOrigin is required for Subresource Integrity on module scripts.
    script.crossOrigin = 'anonymous';
    script.integrity = MINTLIFY_EMBED_INTEGRITY;
    script.src = MINTLIFY_EMBED_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      initPromise = undefined;
      reject(new Error('Failed to load the Mintlify assistant embed script.'));
    };
    document.head.appendChild(script);
  });

  try {
    return await waitForMintlifyAssistant();
  } catch (error) {
    removeEmbedScript();
    throw error;
  }
}

async function ensureInitialized(): Promise<MintlifyAssistantApi> {
  installMintlifyTriggerHider();

  if (!initPromise) {
    initPromise = (async () => {
      const api = await loadEmbedScript();

      await api.init({
        id: MINTLIFY_WIDGET_ID,
        defaultOpen: false,
        appearance: APPEARANCE,
        labels: LABELS,
        starterQuestions: STARTER_QUESTIONS,
      });

      // Ensure copy/appearance win over widget dashboard defaults.
      await api.update({
        appearance: APPEARANCE,
        labels: LABELS,
        starterQuestions: STARTER_QUESTIONS,
      });

      return api;
    })().catch((error) => {
      initPromise = undefined;
      throw error;
    });
  }

  return initPromise;
}

export type OpenMintlifyAssistantOptions = {
  source: string;
  query?: string;
};

export async function openMintlifyAssistant({ source, query }: OpenMintlifyAssistantOptions): Promise<void> {
  if (!IS_AI_FEATURES_ENABLED) {
    return;
  }

  try {
    const api = await ensureInitialized();
    const trimmedQuery = query?.trim();

    if (trimmedQuery) {
      await api.ask(trimmedQuery, {
        source,
        open: true,
        focus: true,
      });

      return;
    }

    await api.open({
      source,
      focus: true,
    });
  } catch (error) {
    console.error('Failed to open Mintlify assistant', error);
    showErrorToast('Unable to open Ask AI right now. Please try again.', 'Ask AI unavailable');
  }
}
