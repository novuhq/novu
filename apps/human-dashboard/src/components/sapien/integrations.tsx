import { INTEGRATIONS, INTEGRATIONS_HEADING } from '@/data/sapien-integrations';

import { IntegrationsTabs } from './integrations-tabs';
import { DisplayAccent, SectionEyebrow } from './section-eyebrow';
import { SectionFrame } from './section-frame';

export function Integrations() {
  return (
    <SectionFrame anchor="integrations" className="px-6 pt-24 pb-10 md:px-8 md:pt-32">
      <SectionEyebrow index={INTEGRATIONS_HEADING.index}>{INTEGRATIONS_HEADING.label}</SectionEyebrow>
      <h2 className="mt-5 text-[34px] leading-[1.1] font-normal tracking-[-0.04em] md:text-[44px]">
        {`${INTEGRATIONS_HEADING.lead} `}
        <DisplayAccent className="text-[1.2em] leading-none">{INTEGRATIONS_HEADING.accent}</DisplayAccent> <br />
        {INTEGRATIONS_HEADING.rest}
      </h2>
      <IntegrationsTabs items={INTEGRATIONS} className="mt-10 md:mt-12" />
    </SectionFrame>
  );
}
