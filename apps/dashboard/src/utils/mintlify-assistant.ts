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
const MINTLIFY_STYLE_ID = 'mintlify-assistant-hide-trigger';

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
  hooks?: {
    event?: (event: { type: string }) => void;
  };
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

let initPromise: Promise<void> | undefined;

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

async function loadEmbedScript(): Promise<void> {
  if (window.MintlifyAssistant) {
    return;
  }

  const existingScript = document.getElementById(MINTLIFY_SCRIPT_ID);

  if (existingScript) {
    await waitForMintlifyAssistant();

    return;
  }

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
      initPromise = undefined;
      reject(new Error('Failed to load the Mintlify assistant embed script.'));
    };
    document.head.appendChild(script);
  });

  await waitForMintlifyAssistant();
}

function setAssistantVisible(isOpen: boolean): void {
  for (const node of document.querySelectorAll('mintlify-assistant')) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    if (isOpen) {
      node.dataset.novuOpen = 'true';
    } else {
      delete node.dataset.novuOpen;
    }
  }
}

function ensureHideTriggerStyles(): void {
  if (document.getElementById(MINTLIFY_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MINTLIFY_STYLE_ID;
  // Hide Mintlify's built-in floating trigger; we use Ask AI entry points instead.
  style.textContent = `
    mintlify-assistant:not([data-novu-open='true']) {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

async function ensureInitialized(): Promise<MintlifyAssistantApi> {
  ensureHideTriggerStyles();

  if (!initPromise) {
    initPromise = (async () => {
      await loadEmbedScript();
      const api = window.MintlifyAssistant!;

      await api.init({
        id: MINTLIFY_WIDGET_ID,
        defaultOpen: false,
        appearance: APPEARANCE,
        labels: LABELS,
        starterQuestions: STARTER_QUESTIONS,
        hooks: {
          event(event) {
            if (event.type === 'open') {
              setAssistantVisible(true);

              return;
            }

            if (event.type === 'close') {
              setAssistantVisible(false);
            }
          },
        },
      });

      // Ensure copy/appearance win over widget dashboard defaults.
      await api.update({
        appearance: APPEARANCE,
        labels: LABELS,
        starterQuestions: STARTER_QUESTIONS,
      });

      setAssistantVisible(false);
    })().catch((error) => {
      initPromise = undefined;
      throw error;
    });
  }

  await initPromise;

  return window.MintlifyAssistant!;
}

export type OpenMintlifyAssistantOptions = {
  source: string;
  query?: string;
};

export async function openMintlifyAssistant({ source, query }: OpenMintlifyAssistantOptions): Promise<void> {
  if (!IS_AI_FEATURES_ENABLED) {
    return;
  }

  const api = await ensureInitialized();
  const trimmedQuery = query?.trim();

  setAssistantVisible(true);

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
}
