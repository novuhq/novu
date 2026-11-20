import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { installMintlifyTriggerHider } from '@/utils/mintlify-trigger-hider';

const MINTLIFY_WIDGET_ID = 'mint_widget_9890b2a3-6a4f-4516-8331-24a3b12e6162';
/**
 * Floating CDN loader. It fetches /v1/manifest.json and dynamically imports whatever
 * versioned runtime that names, so new runtimes (and the v2/message endpoint) ship
 * without a code change here. Pinned /versions/.../embed.js builds call the legacy
 * /message route, which shuts down on 2026-11-09, so do not revert to one.
 *
 * SRI only covers this loader, not the runtime it imports - browsers don't support
 * integrity checks on dynamic `import()`. The loader is a small, deliberately stable
 * shim (unchanged for weeks at a time per its Last-Modified header) that only
 * validates and imports the manifest's same-origin entrypoint, so pinning it still
 * rejects a tampered/compromised loader without reintroducing the staleness that the
 * pinned-version approach had. Bump MINTLIFY_EMBED_INTEGRITY only if this loader's
 * bytes legitimately change: openssl dgst -sha384 -binary embed.js | openssl base64 -A
 */
const MINTLIFY_EMBED_URL = 'https://widget.mintlify.com/v1/embed.js';
const MINTLIFY_EMBED_INTEGRITY = 'sha384-D4vONFcR7SaJqFe6JHyWR6gre3U7DtZ5NaSLtR4HrfDIVG2QZY7X6jNKtKDIrD6k';
const MINTLIFY_SCRIPT_ID = 'mintlify-assistant-embed';

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
