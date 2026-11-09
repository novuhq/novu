'use client';

import { useEffect, useState } from 'react';

import { CopyButton } from '@/components/sapien/copy-button';
import { SectionFrame } from '@/components/sapien/section-frame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/sapien/tabs';
import { AGENTS, type AgentId, CHANNELS, type ChannelId, setupSteps } from '@/data/channel-pages';
import { cn } from '@/lib/utils';

import { LandingHeading } from './shared';

export function ChannelSetup({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const steps = setupSteps(channel, agent);
  const [active, setActive] = useState('0');
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!motionPreference.matches) {
        timer = setTimeout(() => setActive(String((Number(active) + 1) % steps.length)), 10000);
      }
    };
    schedule();
    motionPreference.addEventListener('change', schedule);
    return () => {
      clearTimeout(timer);
      motionPreference.removeEventListener('change', schedule);
    };
  }, [active, paused, steps.length]);
  return (
    <SectionFrame
      anchor="setup"
      auditId="setup"
      className={cn('flex flex-col gap-12 px-4 py-20 md:gap-20 md:px-8 md:py-30', agent && 'mb-0')}
    >
      <LandingHeading
        lead={agent ? `Connect ${AGENTS[agent].name}` : 'Set up in'}
        accent={agent ? 'in four steps' : 'three steps'}
        description={
          agent
            ? `The steps change per agent. These are for ${AGENTS[agent].name}; the ${CHANNELS[channel].name} part is the same everywhere.`
            : `From zero to a ${CHANNELS[channel].noun} your agent can talk through, in about a minute.`
        }
      />
      <Tabs
        value={active}
        onValueChange={(value) => {
          setPaused(true);
          setActive(value);
        }}
        orientation="vertical"
        className="gap-8 md:flex-row md:items-stretch md:gap-12"
      >
        <TabsList
          onFocusCapture={() => setPaused(true)}
          aria-label="Setup steps"
          className="flex-col md:w-100 md:shrink-0"
        >
          {steps.map((step, index) => (
            <TabsTrigger
              key={step.title}
              value={String(index)}
              className="group relative flex flex-col border-l-2 duration-200 ease-out border-sapien-raised py-4 pr-2 pl-6 text-left data-[state=active]:border-accent data-[state=inactive]:text-sapien-foreground/50 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="flex items-center gap-4">
                <span className="font-sapien-mono text-[13px] leading-none tracking-tight group-data-[state=active]:text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-2xl leading-[29px] tracking-[-0.04em]">{step.title}</span>
              </span>
              <span
                aria-hidden={active !== String(index)}
                data-setup-description=""
                className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-out group-data-[state=active]:grid-rows-[1fr] group-data-[state=active]:opacity-100 motion-reduce:transition-none"
              >
                <span className="min-h-0 overflow-hidden">
                  <span className="block pt-2.5 pl-8 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                    {step.description}
                  </span>
                </span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="min-h-58.75 min-w-0 flex-1 overflow-hidden rounded-[14px] bg-sapien-border">
          <div className="flex h-10 items-center justify-between px-4">
            <span aria-hidden="true" className="flex gap-1.5">
              <i className="size-1.5 rounded-full bg-sapien-raised" />
              <i className="size-1.5 rounded-full bg-sapien-raised" />
              <i className="size-1.5 rounded-full bg-sapien-raised" />
            </span>
            <button
              type="button"
              onClick={() => setPaused(!paused)}
              aria-label={paused ? 'Play setup walkthrough' : 'Pause setup walkthrough'}
              className="rounded px-2 py-1 font-sapien-mono text-[11px] text-sapien-foreground/50 hover:text-sapien-foreground focus-visible:outline-2 focus-visible:outline-accent motion-reduce:hidden"
            >
              {paused ? 'Play' : 'Pause'}
            </button>
          </div>
          {steps.map((step, index) => (
            <TabsContent
              key={step.title}
              value={String(index)}
              onFocusCapture={() => setPaused(true)}
              onPointerDownCapture={() => setPaused(true)}
              className="flex min-h-48.75 flex-col justify-between p-4 pt-2 md:p-6 md:pt-2"
            >
              <div className="flex items-start justify-between gap-3">
                <pre className="min-w-0 whitespace-pre-wrap break-words font-sapien-mono text-[13px] leading-5 tracking-tight text-sapien-foreground/70">
                  <span className="text-accent">$ </span>
                  {step.command}
                </pre>
                <CopyButton
                  text={step.command}
                  className="shrink-0 rounded bg-sapien-surface px-2 py-1 font-sapien-mono text-[11px]"
                >
                  Copy
                </CopyButton>
              </div>
              <pre className="mt-12 whitespace-pre-wrap font-sapien-mono text-xs leading-5 text-sapien-foreground/50">
                {step.output}
              </pre>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </SectionFrame>
  );
}
