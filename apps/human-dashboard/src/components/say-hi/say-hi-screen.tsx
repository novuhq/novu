'use client';

import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { finishOnboardingAction } from '@/app/(account)/onboarding/actions';
import { ONBOARDING_EVENTS, trackOnboarding } from '@/components/analytics/analytics';
import { Button } from '@/components/ui/button';
import { MorphingText } from '@/components/ui/morphing-text';
import { type HostId, hostOf } from '@/lib/hosts';
import type { SayHiView } from '@/lib/human-onboarding';
import { openDesktopApp } from '@/lib/open-desktop-app';

import { type BubblePlace, MascotSlot, SpotlightSlot } from './mascot-stage';
import { KeyHints, ScreenLead, ScreenSpace, ScreenTitle, useShortcut } from './parts';
import { CARD_COMMAND, connectedTitle, SAY_HI_PROMPT, sayHiLead, sayHiWayOf, waitingLine } from './say-hi-words';

/** How long the mascot beams as it arrives, once its host has connected. */
const BEAMS_FOR_MS = 2400;

/** A.4a's bubble, over the mascot's right edge: its tail 142px in and 63px down on the 200px mascot. */
const SAY_HI_BUBBLE: BubblePlace = { left: 142 / 200, bottom: (200 - 63) / 200 };

/** How long "Copied" stays on the button. */
const COPIED_MS = 1800;

type SayHiScreenProps = {
  view: SayHiView;
  agent: NonNullable<SayHiView['agent']>;
  pickedHost: HostId;
};

/**
 * A.4a · Say hi · waiting. The host has connected: the mascot wakes up, and the box holds what makes the agent say
 * hi, a prompt to paste or, after a CLI connection, the card command to run. The page waits for the card in the
 * background and moves on by itself; opening the inbox is always the main way on, so nobody waits for it.
 */
export function SayHiScreen({ view, agent, pickedHost }: SayHiScreenProps) {
  const hostId = view.connected?.host ?? pickedHost;
  const host = hostOf(hostId);
  const way = sayHiWayOf(hostId, view.connected?.via ?? null);
  const isCommand = way === 'cli';
  const text = isCommand ? CARD_COMMAND : SAY_HI_PROMPT;
  const opens = way === 'chat' && host.group === 'chat' && Boolean(host.appUrl);
  const [copied, setCopied] = useState(false);
  const [opening, startOpening] = useTransition();
  const [beaming, setBeaming] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBeaming(false), BEAMS_FOR_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // A browser that refuses still gets the app opened: the words are on the screen to copy by hand.
    }
    trackOnboarding(ONBOARDING_EVENTS.COPIED, { step: 'say hi', host: hostId, way, opened: opens });
    if (opens && host.group === 'chat' && host.appUrl) {
      if (host.desktopUrl) {
        openDesktopApp(host.desktopUrl, host.appUrl);
      } else {
        window.open(host.appUrl, '_blank', 'noopener');
      }
    }
  };

  const openInbox = () => {
    trackOnboarding(ONBOARDING_EVENTS.LEFT, { step: 'say hi', button: 'open inbox' });
    startOpening(() => finishOnboardingAction('inbox'));
  };

  useShortcut('c', copy);
  useShortcut('Enter', openInbox, { enabled: !opening });

  const label = copied ? 'Copied' : opens ? `Copy and open ${host.name}` : isCommand ? 'Copy command' : 'Copy prompt';

  return (
    <ScreenSpace above={120} below={137}>
      <div className="relative flex w-full max-w-130 flex-col items-center">
        <SpotlightSlot opacity={0.18} className="top-[-160px] left-[calc(50%-500px)]" />
        <div className="relative flex flex-col items-center">
          {/* The mascot's shadow, under the middle of the screen; the mascot sits 11px to its right. */}
          <span
            aria-hidden="true"
            className="absolute top-[115%] left-1/2 h-4 w-30 -translate-x-1/2 rounded-[50%] bg-black/65"
          />
          <MascotSlot
            bubble="I’m in! Want me to say hi?"
            mood={beaming ? 'happy' : 'awake'}
            bubbleAt={SAY_HI_BUBBLE}
            bubbleWidth={207}
            className="relative left-2.75 w-35 lg:w-50"
          />
        </div>

        <ScreenTitle className="mt-14 text-2xl leading-7.5 lg:mt-28.5">
          {connectedTitle(agent.name, host, way)}
        </ScreenTitle>
        <ScreenLead className="mt-2 max-w-[373px]">{sayHiLead(agent.name, host, way)}</ScreenLead>

        <section className="mt-7 w-full overflow-hidden rounded-xl border border-foreground/10 bg-background">
          <div className="flex flex-col gap-1.5 px-4.5 py-4">
            <p className="font-mono text-[10px] leading-[13px] tracking-[0.8px] text-foreground/40 uppercase">
              {isCommand ? 'CLI' : 'Prompt'}
            </p>
            <p className="font-mono text-[13px] leading-5 break-words text-foreground/90">{text}</p>
          </div>
          <div aria-hidden="true" className="h-px bg-foreground/8" />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 pr-2 pl-4.5">
            {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a waiting state */}
            <p role="status" className="flex min-w-0 items-center gap-2 text-xs leading-4 text-foreground/55">
              <span aria-hidden="true" className="size-1.75 shrink-0 animate-pulse rounded-full bg-accent" />
              <span className="truncate">{waitingLine(agent.name, host, way)}</span>
            </p>
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1.75 rounded-[7px] border border-foreground/14 bg-[#1c1b1a] py-1.75 pr-3 pl-2.75 text-[13px] leading-4.25 font-medium text-foreground transition-colors hover:bg-[#262422]"
            >
              {copied ? (
                <Check className="size-3.5" strokeWidth={0.931} absoluteStrokeWidth aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" strokeWidth={0.931} absoluteStrokeWidth aria-hidden="true" />
              )}
              <MorphingText text={label} />
              {opens && !copied && (
                <ArrowUpRight
                  className="size-3.25 text-foreground/60"
                  strokeWidth={0.865}
                  absoluteStrokeWidth
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </section>

        <Button onClick={openInbox} pending={opening} className="mt-7">
          Open {agent.name}’s inbox
        </Button>
        <div className="mt-4">
          <KeyHints
            hints={[
              { keys: ['enter'], label: 'open inbox' },
              { keys: ['C'], label: opens ? 'copy and open' : isCommand ? 'copy command' : 'copy prompt' },
            ]}
          />
        </div>
      </div>
    </ScreenSpace>
  );
}
