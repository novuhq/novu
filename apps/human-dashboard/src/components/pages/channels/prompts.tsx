import { CardCarousel } from '@/components/sapien/card-carousel';
import { SectionFrame } from '@/components/sapien/section-frame';
import { type AgentId, agentPage, type ChannelId, plain } from '@/data/channel-pages';
import { promptVisuals } from '@/data/channel-prompt-visuals';

import { PromptScene } from './prompt-scene';

import { LandingHeading } from './shared';

export function AgentPrompts({ channel, agent }: { channel: ChannelId; agent: AgentId }) {
  const visuals = promptVisuals(channel, agent);
  const prompts = agentPage(channel, agent).prompts.map((prompt, index) => ({ ...prompt, visual: visuals[index] }));
  const agentLabel = agent === 'any-agent' ? 'agent' : agent;
  return (
    <SectionFrame anchor="prompts" auditId="prompts" className="flex flex-col gap-14 px-4 py-20 md:px-8 md:py-30">
      <LandingHeading lead="Try these" accent="prompts" inline />
      <div className="min-w-0">
        <CardCarousel
          label="Example agent prompts"
          previousLabel="Previous prompt"
          nextLabel="Next prompt"
          ofLabel="of"
          className="gap-8 [&_button]:size-12 [&>ul]:gap-6 [&>ul>li]:w-[90%] md:[&>ul>li]:w-100"
          slides={prompts.map((prompt, index) => (
            <article
              key={prompt.prompt}
              className="w-full overflow-hidden rounded-[20px] ring-1 ring-inset ring-sapien-border"
            >
              <PromptScene channel={channel} visual={prompt.visual} number={index + 1} agentLabel={agentLabel} />
              <div className="min-h-42.25 border-t border-sapien-border p-6">
                <h3 className="text-2xl leading-[30px] tracking-[-0.04em]">
                  “{prompt.prompt}”{prompt.note ? ` ${prompt.note}` : ''}
                </h3>
                <p className="mt-3 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                  {plain(prompt.result)}
                </p>
              </div>
            </article>
          ))}
        />
      </div>
    </SectionFrame>
  );
}
