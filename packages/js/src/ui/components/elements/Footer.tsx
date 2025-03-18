/* eslint-disable local-rules/no-class-without-style */
import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { isBrowser } from 'src/utils/is-browser';
import { Novu } from '../../icons';
import { cn } from '../../helpers';

const hue = 20;
const saturation = 100;
const stripeColor = `${hue},${saturation}%,64%`;
const gradientBackground = `${hue},${saturation}%,98%`;
const stripes = `before:nt-content-[""] before:nt-absolute before:nt-inset-0 before:-nt-right-[calc(0+var(--stripes-size))] before:nt-bg-dev-stripes-gradient before:nt-bg-[length:var(--stripes-size)_var(--stripes-size)] before:hover:nt-animate-stripes`;
const commonAfter = 'after:nt-content-[""] after:nt-absolute after:nt-inset-0 after:-nt-top-8';
const devModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,#0000_0,hsl(var(--gradient-background))_50%,#0000)]`;
const prodModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,#0000_0,#fff_50%,#0000)]`;

export const Footer = () => {
  const { hideBranding, isDevelopmentMode } = useInboxContext();

  return (
    <Show when={!hideBranding() || isDevelopmentMode()}>
      <div
        class={cn(
          `nt-relative nt-flex nt-shrink-0 nt-justify-center nt-items-center nt-gap-1 nt-mt-auto nt-py-3 nt-text-foreground-alpha-400`,
          {
            [stripes]: isDevelopmentMode(),
            [devModeGradient]: isDevelopmentMode(),
            [prodModeGradient]: !isDevelopmentMode(),
          }
        )}
        style={{
          '--stripes-size': '15px',
          '--stripes-color': stripeColor,
          '--gradient-background': gradientBackground,
        }}
      >
        <Show when={isDevelopmentMode()}>
          <span class="nt-z-10 nt-text-xs nt-text-[hsl(var(--stripes-color))]">Development mode</span>
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
    </Show>
  );
};

function getCurrentDomain() {
  if (isBrowser()) {
    return window.location.hostname;
  }

  return '';
}
