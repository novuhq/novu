import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sapien/tabs';
import { INBOX_AGENTS, INBOX_CHANNELS, INBOX_LABELS, INBOX_SECTION } from '@/data/sapien-inbox';

import { AgentLogo, CHANNEL_NAMES, ChannelLogo } from './brand-logo';
import { InboxFlow } from './inbox-flow';
import { DisplayAccent, SectionEyebrow } from './section-eyebrow';
import { SectionFrame } from './section-frame';

/**
 * The human inbox, with the agent reading underneath. The copy stays short on the left. The right is a normal
 * mail list until a pointer moves across a row, which opens the fields that agent reads.
 */
export function InboxSection() {
  return (
    <SectionFrame anchor="inbox" className="px-4 pt-20 pb-14 sm:px-8 md:pt-28 md:pb-24">
      <Tabs
        defaultValue={INBOX_SECTION.defaultAgent}
        orientation="vertical"
        className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
      >
        <div className="flex min-w-0 flex-col">
          <SectionEyebrow index={INBOX_SECTION.index}>{INBOX_SECTION.label}</SectionEyebrow>
          <h2 className="mt-5 text-[34px] leading-[1.05] font-normal tracking-[-0.04em] text-balance md:text-[44px]">
            {INBOX_SECTION.title.lead}{' '}
            <DisplayAccent className="block text-[40px] leading-[1.05] md:text-[54px]">
              {INBOX_SECTION.title.accent}
            </DisplayAccent>
          </h2>
          <p className="mt-5 max-w-88 text-[17px] leading-[1.45] tracking-tight text-pretty text-sapien-foreground/50">
            {INBOX_SECTION.description}
          </p>

          <div className="mt-6 flex items-center gap-3.5">
            {/* One stack, like a row of avatars: the ring is the page colour, so the overlap disappears into it. */}
            <ul aria-label={INBOX_LABELS.channels} className="flex items-center">
              {INBOX_CHANNELS.map((item, index) => (
                <li
                  key={item.channel}
                  className="relative flex rounded-full ring-[3px] ring-black not-first:-ml-3"
                  style={{ zIndex: INBOX_CHANNELS.length - index }}
                >
                  <ChannelLogo
                    channel={item.channel}
                    size={32}
                    className={item.channel === 'slack' ? 'bg-white' : undefined}
                  />
                  <span className="sr-only">
                    {CHANNEL_NAMES[item.channel]}
                    {item.soon ? ` ${INBOX_LABELS.soon}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="font-sapien-mono text-[11px] leading-[1.35] tracking-tight text-sapien-foreground/40">
              Email, Slack, Telegram
              <span className="mt-0.5 block text-sapien-foreground/25">WhatsApp and iMessage soon</span>
            </p>
          </div>

          <TabsList aria-label={INBOX_SECTION.tabsLabel} className="mt-8 flex-col border-t border-sapien-border">
            {INBOX_AGENTS.map((agent, index) => (
              <TabsTrigger
                key={agent.value}
                value={agent.value}
                className="group/tab relative flex w-full items-center gap-3 border-b border-sapien-border py-3 pr-2 pl-1 text-left focus-visible:outline-offset-[-2px]"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-2.5 bottom-2.5 -left-px w-0.5 scale-y-0 bg-accent opacity-0 transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=active]/tab:scale-y-100 group-data-[state=active]/tab:opacity-100 motion-reduce:transition-none"
                />
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 pl-2 font-sapien-pixel text-[10px] leading-none text-sapien-foreground/25 group-data-[state=active]/tab:text-sapien-foreground/60"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <AgentLogo
                  agent={agent.host}
                  className="opacity-50 grayscale transition-[opacity,filter] duration-200 group-hover/tab:opacity-80 group-data-[state=active]/tab:opacity-100 group-data-[state=active]/tab:grayscale-0 motion-reduce:transition-none"
                />
                <span className="min-w-0 truncate text-base leading-none tracking-tight text-sapien-foreground/45 transition-colors duration-200 group-hover/tab:text-sapien-foreground/70 group-data-[state=active]/tab:text-sapien-foreground">
                  {agent.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="min-w-0">
          {INBOX_AGENTS.map((agent) => (
            <TabsContent key={agent.value} value={agent.value} className="focus-visible:-outline-offset-2">
              <InboxFlow agent={agent} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </SectionFrame>
  );
}
