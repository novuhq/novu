import { CopyButton } from '@/components/sapien/copy-button';
import { CopyCommand } from '@/components/sapien/copy-command';
import { SETUP_COMMAND } from '@/data/sapien';
import {
  CLOSING_PROMPT,
  CLOSING_PROMPT_ERROR_MESSAGE,
  CLOSING_PROMPT_LABEL,
  CLOSING_PROMPT_SUCCESS_MESSAGE,
} from '@/data/sapien-closing';
import {
  HERO_CARD_INTERVAL,
  HERO_COMMAND_LABEL,
  HERO_DESCRIPTION,
  HERO_FIGURE_CAPTION,
  HERO_FIGURE_DESCRIPTION,
  HERO_FIGURE_LABEL,
  HERO_FIGURE_STATE,
  HERO_RELATIONS,
  HERO_TITLE,
  HERO_TITLE_WORDS,
  HERO_WORD_INTERVAL,
  heroAssets,
} from '@/data/sapien-hero';

import { AgentIdCard } from './agent-id-card';
import { Artwork } from './artwork';
import { BusinessCard, CallCard } from './hero-card';
import { HeroMotionProvider } from './hero-motion';
import { HeroStage } from './hero-stage';
import { HeroTitleLine } from './hero-title';
import { SectionFrame } from './section-frame';

// Figma interpolates its fades from #0a0a0a to transparent black without
// premultiplying (colour and alpha both fall linearly), which these stops mimic.
const fadeTop =
  'radial-gradient(6144px 548.33px at 50% 0, #0a0a0a 0%, rgb(7.5 7.5 7.5 / 0.75) 16.289%, rgb(5 5 5 / 0.5) 32.578%, rgb(2.5 2.5 2.5 / 0.25) 48.867%, transparent 65.156%)';
const fadeBottom =
  'radial-gradient(6144px 366px at 50% 100%, #0a0a0a 18.738%, rgb(7.5 7.5 7.5 / 0.75) 29.827%, rgb(5 5 5 / 0.5) 40.916%, rgb(2.5 2.5 2.5 / 0.25) 52.005%, transparent 63.094%)';
// The mobile frame (894:1193) sizes the same fades differently.
const fadeTopMobile =
  'radial-gradient(7416.6px 661.9px at 50% 0, #0a0a0a 0%, rgb(7.5 7.5 7.5 / 0.75) 16.289%, rgb(5 5 5 / 0.5) 32.578%, rgb(2.5 2.5 2.5 / 0.25) 48.867%, transparent 65.156%)';
const fadeBottomMobile =
  'radial-gradient(4118.6px 245.34px at 50% 100%, #0a0a0a 18.738%, rgb(7.5 7.5 7.5 / 0.75) 29.827%, rgb(5 5 5 / 0.5) 40.916%, rgb(2.5 2.5 2.5 / 0.25) 52.005%, transparent 63.094%)';

export function Hero() {
  return (
    <SectionFrame
      anchor="hero"
      // --hero-scale shrinks the 960×783 illustration with the section below 546px
      // (0.6227 at the 340px mobile frame); desktop always draws it at 1.
      className="@container flex flex-col pt-[70px] [--hero-scale:min(1,tan(atan2(100cqw,546px)))] sm:h-[783px] sm:pt-14"
    >
      <HeroMotionProvider>
        <div aria-hidden="true" className="pointer-events-none">
          <div className="absolute inset-x-px bottom-px z-[1] h-[75px] bg-linear-to-b from-transparent to-black to-[73.836%] sm:h-[249px]" />
          <div
            className="absolute inset-x-px bottom-0 z-[1] h-[183px] sm:hidden"
            style={{ backgroundImage: fadeBottomMobile }}
          />
          <div
            className="absolute inset-x-px bottom-0 z-[1] h-[273px] max-sm:hidden"
            style={{ backgroundImage: fadeBottom }}
          />
          <div
            className="absolute inset-x-px top-0 z-[1] h-[494px] sm:hidden"
            style={{ backgroundImage: fadeTopMobile }}
          />
          <div
            className="absolute inset-x-px top-px z-[1] h-[409px] max-sm:hidden"
            style={{ backgroundImage: fadeTop }}
          />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-121 flex-col items-center gap-5 px-2.5 text-center sm:px-0">
          <div className="flex flex-col items-center gap-5 sm:gap-6">
            {/* Mobile sizes also shrink with the section (cqw) below ~275px so both
                lines fit, even with the widest pill word (9.08em = the centred
                Telegram line); the title may still wrap when a visitor enlarges
                text spacing. */}
            <h1 className="flex flex-col items-center gap-3 font-normal">
              <HeroTitleLine
                lead={HERO_TITLE.lead}
                words={HERO_TITLE_WORDS}
                rest={HERO_TITLE.rest}
                interval={HERO_WORD_INTERVAL}
                className="min-h-[1.142857em] text-[min(28px,calc((100cqw-20px)/9.08))] leading-[1.125] tracking-[-0.04em] sm:min-h-0 sm:text-[32px]"
              />{' '}
              <span className="block min-h-[0.729167em] font-sapien-display text-[min(48px,calc((100cqw-20px)/5))] leading-none tracking-tight text-accent italic [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] sm:h-[42px] sm:min-h-0 sm:text-[58px]">
                {HERO_TITLE.accent}
              </span>
            </h1>
            <p className="text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50 sm:h-[42px] sm:leading-[1.375]">
              {HERO_DESCRIPTION[0]}
              <br className="max-sm:hidden" /> {HERO_DESCRIPTION[1]}
            </p>
          </div>
          {/* Wraps so a failed prompt copy can show the prompt on a line of its own, under both. */}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <CopyCommand
              command={SETUP_COMMAND}
              label={HERO_COMMAND_LABEL}
              variant="icon"
              className="w-full text-left sm:w-[283px]"
            />
            <CopyButton
              text={CLOSING_PROMPT}
              successMessage={CLOSING_PROMPT_SUCCESS_MESSAGE}
              errorMessage={CLOSING_PROMPT_ERROR_MESSAGE}
              showTextOnError
              className="h-10 w-full rounded-lg bg-sapien-border px-6 text-[15px] leading-none font-medium tracking-tight text-sapien-foreground hover:bg-sapien-surface sm:w-[139px]"
            >
              {CLOSING_PROMPT_LABEL}
            </CopyButton>
          </div>
        </div>
        <HeroStage
          cards={[<BusinessCard key="business" />, <AgentIdCard key="agent-id" />, <CallCard key="call" />]}
          relations={HERO_RELATIONS}
          interval={HERO_CARD_INTERVAL}
          label={HERO_FIGURE_LABEL}
          description={HERO_FIGURE_DESCRIPTION}
          caption={HERO_FIGURE_CAPTION}
          states={HERO_FIGURE_STATE}
          stackMask={{
            image: heroAssets.stackMask.src,
            size: '810.307px 580.307px',
            position: '71.346px 100.346px',
          }}
          backdrop={
            <Artwork asset={heroAssets.light} className="absolute top-[243px] left-[-44px] h-[667px] w-[1049px]" />
          }
          foreground={
            <Artwork asset={heroAssets.robotArms} className="absolute top-[350px] left-5 h-[432px] w-[910px]" />
          }
        />
      </HeroMotionProvider>
    </SectionFrame>
  );
}
