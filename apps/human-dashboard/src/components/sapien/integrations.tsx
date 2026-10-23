import { INTEGRATIONS, INTEGRATIONS_HEADING } from '@/data/sapien-integrations';

import { IntegrationsTabs } from './integrations-tabs';
import { SectionFrame } from './section-frame';

export function Integrations() {
  return (
    <SectionFrame anchor="integrations" className="px-6 pt-20 pb-8 md:px-8 md:pt-37">
      <h2 className="text-3xl leading-[1.125] tracking-[-0.04em] md:text-[40px]">
        {/* Figma sets this mixed Inter/IvyPresto line 2px lower than a browser line box does. */}
        <span className="relative top-0.5">
          {`${INTEGRATIONS_HEADING.lead} `}
          <em className="font-sapien-display tracking-tight text-accent">{INTEGRATIONS_HEADING.accent}</em>
        </span>{' '}
        <br />
        {INTEGRATIONS_HEADING.rest}
      </h2>
      <IntegrationsTabs items={INTEGRATIONS} className="mt-10 md:mt-12" />
    </SectionFrame>
  );
}
