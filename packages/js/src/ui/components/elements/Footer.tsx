import { Show } from 'solid-js';
import { useInboxContext, useNovu } from 'src/ui/context';
import { isBrowser } from 'src/utils/is-browser';
import { DEFAULT_API_VERSION } from '../../../api/http-client';
import { cn } from '../../helpers';
import { Novu } from '../../icons';
import { ArrowUpRight } from '../../icons/ArrowUpRight';
import { CopyToClipboard } from '../primitives/CopyToClipboard';
import { Tooltip } from '../primitives/Tooltip';

const stripes = `before:nt-content-[""] before:nt-absolute before:nt-inset-0 before:-nt-right-[calc(0+var(--stripes-size))] before:[mask-image:linear-gradient(transparent_0%,black)] before:nt-bg-dev-stripes-gradient before:nt-bg-[length:var(--stripes-size)_var(--stripes-size)] before:nt-animate-stripes before:hover:[animation-play-state:running]`;
const commonAfter = 'after:nt-content-[""] after:nt-absolute after:nt-inset-0 after:-nt-top-12';
const devModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,transparent,oklch(from_var(--nv-color-stripes)_l_c_h_/_0.07)_55%,transparent),linear-gradient(180deg,transparent,oklch(from_var(--nv-color-background)_l_c_h_/_0.9)_55%,transparent)]`;
const prodModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,transparent,oklch(from_var(--nv-color-background)_l_c_h_/_0.9)_55%,transparent)]`;

export const Footer = () => {
  const { hideBranding, isDevelopmentMode, isKeyless } = useInboxContext();
  const novu = useNovu();

  async function handleTriggerHelloWorld() {
    try {
      await novu.notifications.triggerHelloWorldEvent();
      // TODO: maybe add some user feedback on success?
    } catch (error) {
      // Error is already logged by the service, but you could add UI feedback here
      console.error('Failed to send Hello World from UI via novu.notifications:', error);
    }
  }

  return (
    <Show when={!hideBranding() || isDevelopmentMode()}>
      <div
        class={cn(
          `nt-relative nt-flex nt-shrink-0 nt-flex-col nt-justify-center nt-items-center nt-gap-1 nt-mt-auto nt-py-3 nt-text-foreground-alpha-400`,
          {
            [stripes]: isDevelopmentMode(),
            [devModeGradient]: isDevelopmentMode(),
            'nt-bg-[oklch(from_var(--nv-color-stripes)_l_c_h_/_0.1)]': isDevelopmentMode(),
            [prodModeGradient]: !isDevelopmentMode(),
          }
        )}
        style={{
          '--stripes-size': '15px',
        }}
      >
        <div class="nt-flex nt-items-center nt-gap-1">
          <Show when={isDevelopmentMode()}>
            <span class="nt-z-10 nt-text-xs nt-text-stripes">
              {isKeyless() ? (
                <Tooltip.Root>
                  <Tooltip.Trigger class="">
                    <a
                      href="https://go.novu.co/keyless?utm_campaign=keyless-mode"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Keyless mode
                    </a>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    Temporary &lt;Inbox /&gt;. All data will expire in 24 hours.
                    <br />
                    Connect API key to persist.
                  </Tooltip.Content>
                </Tooltip.Root>
              ) : (
                'Development mode'
              )}
            </span>
          </Show>
          <Show when={isDevelopmentMode() && !hideBranding()}>
            <span class="nt-z-10 nt-text-xs">•</span>
          </Show>
          <Show when={!hideBranding()}>
            <a
              href={`https://go.novu.co/powered?ref=${getCurrentDomain()}`}
              target="_blank"
              class="nt-z-10 nt-flex nt-items-center nt-gap-1 nt-justify-center"
            >
              <span class="nt-text-xs">Inbox by</span>
              <Novu class="nt-size-2.5" />
              <span class="nt-text-xs">Novu</span>
            </a>
          </Show>
        </div>
        <Show when={isKeyless()}>
          <div class="nt-z-10 nt-flex nt-items-center nt-gap-1 nt-text-xs nt-text-secondary-foreground">
            <a
              href="https://go.novu.co/keyless"
              class="nt-underline nt-flex nt-items-center nt-gap-0.5"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get API key
              <ArrowUpRight class="nt-ml-1" />
            </a>
            <span>•</span>
            <CopyToClipboard textToCopy={getCurlCommand()}>
              <span class="nt-underline">Copy cURL</span>
            </CopyToClipboard>
            <span>•</span>
            <button
              type="button"
              class="nt-underline"
              onClick={(e) => {
                e.preventDefault();
                handleTriggerHelloWorld();
              }}
            >
              Send notification
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
};

function getCurrentDomain() {
  if (isBrowser()) {
    return window.location.hostname;
  }

  return '';
}

function getCurlCommand() {
  const identifier = window.localStorage.getItem('novu_keyless_application_identifier');
  if (!identifier) {
    console.error('Novu application identifier not found for cURL command.');

    return '';
  }
  const DEFAULT_BACKEND_URL =
    (typeof window !== 'undefined' && (window as any).NOVU_LOCAL_BACKEND_URL) || 'https://api.novu.co';

  return `curl -X POST \
  ${DEFAULT_BACKEND_URL}/${DEFAULT_API_VERSION}/events/trigger \
  -H 'Authorization: Keyless ${identifier}' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "hello-world",
    "to": {
      "subscriberId": "keyless-subscriber-id"
    },
    "payload": {
      "body": "New From Keyless Environment",
      "subject": "Hello World!"
    }
  }'`;
}
