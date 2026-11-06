import Image from 'next/image';

import { CardCarousel } from '@/components/sapien/card-carousel';
import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, CHANNELS, type ChannelId } from '@/data/channel-pages';

import { LandingHeading } from './shared';

export function AgentPrompts({ channel, agent }: { channel: ChannelId; agent: AgentId }) {
  const name = AGENTS[agent].name;
  const prompts = [
    {
      kind: 'approve',
      title: `“Before you pay any invoice over $500, ask me ${CHANNELS[channel].location}.”`,
      description: `${name} pauses before the payment and waits for one tap.`,
    },
    {
      kind: 'choose',
      title: '“Find a table for two on Friday and let me pick.”',
      description: `The options arrive as buttons. You tap one, ${name} books it.`,
    },
    {
      kind: 'tell',
      title: '“Tell me when the nightly scrape finishes.”',
      description: 'A short status message when the job is done. No reply needed.',
    },
  ];
  return (
    <SectionFrame anchor="prompts" auditId="prompts" className="flex flex-col gap-14 px-4 py-20 md:px-8 md:py-30">
      <LandingHeading
        lead="Try these"
        accent="prompts"
        inline
        description={`Paste one into ${name}. Each ends with a message on your phone.`}
      />
      <div className="min-w-0">
        <CardCarousel
          label="Example agent prompts"
          previousLabel="Previous prompt"
          nextLabel="Next prompt"
          ofLabel="of"
          className="gap-8 [&_button]:size-12 [&>ul]:gap-6 [&>ul>li]:w-[90%] md:[&>ul>li]:w-100"
          slides={prompts.map((prompt) => (
            <article
              key={prompt.kind}
              className="w-full overflow-hidden rounded-[20px] ring-1 ring-inset ring-sapien-border"
            >
              <Image
                src={`/images/landing/prompt-${prompt.kind}.png`}
                alt={`Example ${prompt.kind} request and its reply in Telegram.`}
                width={800}
                height={580}
                className="h-auto w-full"
                unoptimized
              />
              <div className="min-h-42.25 border-t border-sapien-border p-6">
                <h3 className="text-2xl leading-[30px] tracking-[-0.04em]">{prompt.title}</h3>
                <p className="mt-3 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                  {prompt.description}
                </p>
              </div>
            </article>
          ))}
        />
      </div>
    </SectionFrame>
  );
}
