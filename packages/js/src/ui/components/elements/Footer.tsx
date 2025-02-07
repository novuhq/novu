/* eslint-disable local-rules/no-class-without-style */
import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { isBrowser } from 'src/utils/is-browser';
import { Novu } from '../../icons';

export const Footer = () => {
  const { hideBranding } = useInboxContext();

  return (
    <Show when={!hideBranding()}>
      <div class="nt-flex nt-shrink-0 nt-justify-center nt-items-center nt-gap-1 nt-mt-auto nt-pt-9 nt-pb-3 nt-text-foreground-alpha-200">
        <a
          href={`https://go.novu.co/powered?ref=${getCurrentDomain()}`}
          target="_blank"
          class="nt-block nt-w-full nt-flex nt-items-center nt-gap-1 nt-justify-center"
        >
          <Novu />
          <span class="nt-text-xs">Powered by Novu</span>
        </a>
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
