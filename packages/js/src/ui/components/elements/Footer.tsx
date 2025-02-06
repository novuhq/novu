/* eslint-disable local-rules/no-class-without-style */
import { Show } from 'solid-js';
import { useInboxContext } from 'src/ui/context';
import { Novu } from '../../icons';

export const Footer = () => {
  const { hideBranding } = useInboxContext();

  return (
    <Show when={!hideBranding()}>
      <a
        href={`https://go.novu.co/powered?ref=`}
        target="_blank"
        class="nt-flex nt-shrink-0 nt-justify-center nt-items-center nt-gap-1 nt-mt-auto nt-pt-9 nt-pb-3 nt-text-foreground-alpha-200 hover:nt-text-foreground-alpha-300 nt-no-underline nt-transition-colors"
      >
        <Novu />
        <span class="nt-text-xs">Powered by Novu</span>
      </a>
    </Show>
  );
};
