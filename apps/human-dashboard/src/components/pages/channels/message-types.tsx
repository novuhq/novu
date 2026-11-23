'use client';

import Image from 'next/image';

import { PillTab, PillTabsList } from '@/components/sapien/pill-tabs';
import { SectionFrame } from '@/components/sapien/section-frame';
import { Tabs, TabsContent } from '@/components/sapien/tabs';
import { CHANNELS, type ChannelId, channelHub, type MessageExample } from '@/data/channel-pages';
import { HUB_VISUALS } from '@/data/channel-prompt-visuals';

import { PromptScene } from './prompt-scene';
import { LandingHeading } from './shared';

export function MessageTypes({ channel }: { channel: ChannelId }) {
  const hub = channelHub(channel);
  return (
    <SectionFrame
      anchor="message-types"
      auditId="message-types"
      className="flex flex-col gap-6 px-4 py-20 md:px-8 md:py-30"
    >
      <LandingHeading
        className="md:pb-8"
        lead="Ask, approve, choose, tell"
        accent={CHANNELS[channel].location}
        description={hub.messageIntro}
      />
      <Tabs defaultValue="approve" className="mt-8 gap-6 md:mt-0">
        <PillTabsList aria-label="Message types" className="[&_[role=tablist]]:px-1 [&_[role=tablist]]:py-1">
          {hub.messages.map((example) => (
            <PillTab key={example.id} value={example.id} className="data-[state=active]:bg-white">
              {example.label}
            </PillTab>
          ))}
        </PillTabsList>
        {hub.messages.map((example) => (
          <TabsContent
            key={example.id}
            value={example.id}
            className="grid overflow-hidden rounded-[14px] bg-sapien-border/50 p-2 md:min-h-88 md:w-[calc(100%+2px)] md:grid-cols-[432px_minmax(0,1fr)] md:gap-2"
          >
            <div className="flex min-h-84 min-w-0 flex-col justify-between p-6">
              <div>
                <p className="mb-5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/70">
                  {example.description}
                </p>
                <pre className="whitespace-pre-wrap break-words font-sapien-mono text-sm leading-[22px] tracking-[-0.01em] text-sapien-foreground/50">
                  <span className="text-accent">$ </span>
                  {example.command}
                </pre>
              </div>
              <pre className="mt-8 border-t border-sapien-foreground/10 pt-4 font-sapien-mono text-[13px] leading-[18px] whitespace-pre-wrap text-sapien-foreground/50">
                {example.resultNote ? (
                  <>
                    <span className="text-sapien-foreground">{example.result}</span>
                    {`\n(${example.resultNote})`}
                  </>
                ) : (
                  example.result
                )}
              </pre>
            </div>
            <div className="relative flex h-84 items-center justify-center overflow-hidden rounded-[10px] border border-sapien-border bg-sapien-surface/40 p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[-120px] top-[-17px] flex h-[493px] w-[802.809px] items-center justify-center mix-blend-difference"
              >
                <div className="relative h-[802.809px] w-[493px] shrink-0 -rotate-90 overflow-hidden">
                  <Image
                    src="/images/landing/message-particles.jpg"
                    alt=""
                    fill
                    className="absolute -left-[0.455%] -top-[0.135%] h-[100.27%] w-[100.91%] max-w-none"
                    unoptimized
                  />
                </div>
              </div>
              <MessageVisual channel={channel} example={example} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </SectionFrame>
  );
}

/** The picture beside a message type's command: Approve and Ask are drawn images, Choose and Tell are drawn in code. */
function MessageVisual({ channel, example }: { channel: ChannelId; example: MessageExample }) {
  if (example.id === 'approve') {
    return (
      <div
        role="img"
        aria-label={example.alt}
        className="relative w-full max-w-86 overflow-hidden rounded-[10px] border border-sapien-border bg-black p-4"
      >
        <Image
          src="/images/landing/approve-text.svg"
          width={310}
          height={42}
          alt=""
          className="block h-auto w-full"
          unoptimized
        />
        <Image
          src="/images/landing/approve-actions.svg"
          width={310}
          height={52}
          alt=""
          className="block h-auto w-full"
          unoptimized
        />
      </div>
    );
  }
  if (example.id === 'choose' || example.id === 'tell') {
    return (
      <div className="relative w-full max-w-86 overflow-hidden rounded-[10px] border border-sapien-border bg-black">
        <PromptScene
          channel={channel}
          visual={HUB_VISUALS[channel][example.id]}
          number={example.id === 'choose' ? 3 : 4}
          agentLabel="agent"
          className="min-h-0"
        />
      </div>
    );
  }
  return (
    <Image
      src={`/images/landing/${example.image}`}
      width={906}
      height={924}
      alt={example.alt}
      className="relative max-h-full w-auto object-contain"
      unoptimized
    />
  );
}
