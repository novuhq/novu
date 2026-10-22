import { Tabs, TabsContent } from '@/components/sapien/tabs';
import { INBOX_AGENTS, INBOX_SECTION } from '@/data/sapien-inbox';

import { InboxDashboard } from './inbox-dashboard';
import { PillTab, PillTabsList } from './pill-tabs';
import { SectionFrame } from './section-frame';

export function InboxSection() {
  return (
    <SectionFrame anchor="inbox" className="px-4 pt-24 pb-4 sm:px-[31.5px] sm:pb-8 md:pt-44 md:pb-12.5">
      <h2 className="text-center text-3xl leading-[1.125] tracking-[-0.04em] text-balance md:text-[40px]">
        {INBOX_SECTION.title}
      </h2>

      <Tabs defaultValue={INBOX_SECTION.defaultAgent} className="mt-10 md:mt-9">
        {/* Below sm the strip runs from rail to rail. */}
        <PillTabsList aria-label={INBOX_SECTION.tabsLabel} className="-mx-4 sm:mx-auto sm:w-full sm:max-w-191.5">
          {INBOX_AGENTS.map((agent) => (
            <PillTab key={agent.value} value={agent.value}>
              {agent.label}
            </PillTab>
          ))}
        </PillTabsList>

        <div className="relative mx-auto mt-6 w-full max-w-224.25 md:mt-6 lg:left-[0.5px]">
          {/* Below lg the frame grows with its content, so larger text never runs under the badge. */}
          <div className="relative flex min-h-160 flex-col overflow-clip rounded-[14px] bg-border sm:min-h-144 lg:block lg:h-140 lg:min-h-0">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-69 bg-linear-to-b from-transparent from-14% to-black"
            />
            <div className="relative mx-2 mt-2 -mb-2.5 flex flex-1 flex-col overflow-clip rounded-lg bg-black shadow-[0_4px_8px_rgba(0,0,0,0.74)] lg:absolute lg:inset-x-2 lg:top-2 lg:-bottom-2.5 lg:m-0 lg:block">
              <div className="grid flex-1 grid-cols-1 lg:h-full">
                {INBOX_AGENTS.map((agent) => (
                  <TabsContent
                    key={agent.value}
                    value={agent.value}
                    forceMount
                    className="col-start-1 row-start-1 min-h-0 transition-opacity duration-200 focus-visible:-outline-offset-2 data-[state=inactive]:invisible data-[state=inactive]:opacity-0 data-[state=inactive]:transition-none motion-reduce:transition-none"
                  >
                    <InboxDashboard agent={agent} />
                  </TabsContent>
                ))}
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-62.5 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.65)_60%,#000_96%)]"
              />
            </div>
          </div>
        </div>
      </Tabs>
    </SectionFrame>
  );
}
