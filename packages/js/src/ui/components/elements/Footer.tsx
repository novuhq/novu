/* eslint-disable local-rules/no-class-without-style */
import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { isBrowser } from 'src/utils/is-browser';
import { Novu } from '../../icons';
import { cn } from '../../helpers';

const stripes = `before:nt-content-[""] before:nt-absolute before:nt-inset-0 before:-nt-right-[calc(0+var(--stripes-size))] before:[mask-image:linear-gradient(transparent_0%,black)] before:nt-bg-dev-stripes-gradient before:nt-bg-[length:var(--stripes-size)_var(--stripes-size)] before:nt-animate-stripes before:hover:[animation-play-state:running]`;
const commonAfter = 'after:nt-content-[""] after:nt-absolute after:nt-inset-0 after:-nt-top-12';
const devModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,transparent,oklch(from_var(--nv-color-stripes)_l_c_h_/_0.07)_55%,transparent),linear-gradient(180deg,transparent,oklch(from_var(--nv-color-background)_l_c_h_/_0.9)_55%,transparent)]`;
const prodModeGradient = `${commonAfter} after:nt-bg-[linear-gradient(180deg,transparent,oklch(from_var(--nv-color-background)_l_c_h_/_0.9)_55%,transparent)]`;

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
            'nt-bg-[oklch(from_var(--nv-color-stripes)_l_c_h_/_0.1)]': isDevelopmentMode(),
            [prodModeGradient]: !isDevelopmentMode(),
          }
        )}
        style={{
          '--stripes-size': '15px',
        }}
      >
        <Show when={isDevelopmentMode()}>
          <span class="nt-z-10 nt-text-xs nt-text-stripes">Development mode</span>
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
