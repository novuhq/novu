import { CopyButton } from '@/components/sapien/copy-button';
import { CopyCommand } from '@/components/sapien/copy-command';
import {
  closingAssets as assets,
  CLOSING_COMMAND,
  CLOSING_COMMAND_LABEL,
  CLOSING_DESCRIPTION,
  CLOSING_HEADING,
  CLOSING_PROMPT,
  CLOSING_PROMPT_ERROR_MESSAGE,
  CLOSING_PROMPT_LABEL,
  CLOSING_PROMPT_SUCCESS_MESSAGE,
} from '@/data/sapien-closing';

import { AgentIdCard } from './agent-id-card';
import { Artwork } from './artwork';
import { SectionFrame } from './section-frame';

// Figma feathers the card with a blurred 575×360 ellipse; this box is the mask
// image (ellipse plus blur bleed), placed at (-225.654, -250.654) from the card.
const cardMask = {
  maskImage: `url(${assets.cardMask.src})`,
  maskRepeat: 'no-repeat',
  maskSize: '100% 100%',
} as const;

export function Closing() {
  return (
    <SectionFrame
      anchor="get-started"
      className="px-2.5 pt-22 pb-2.5 sm:px-4 sm:pt-20 sm:pb-[595px] md:px-8 lg:min-h-135 lg:pt-[137px] lg:pb-0"
    >
      <div className="relative z-10 w-full sm:max-w-87.75">
        <h2 className="text-[36px] leading-[1.125] tracking-[-0.04em] sm:text-[40px]">
          {CLOSING_HEADING.lead}
          <br />
          {`${CLOSING_HEADING.rest} `}
          <em className="font-sapien-display leading-[0] tracking-tight text-accent">{CLOSING_HEADING.accent}</em>
        </h2>
        <p className="mt-[13px] h-[42px] text-[15px] leading-[1.375] tracking-tight text-sapien-foreground/70 sm:mt-[11px]">
          {CLOSING_DESCRIPTION[0]}
          <br />
          {CLOSING_DESCRIPTION[1]}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <CopyCommand command={CLOSING_COMMAND} label={CLOSING_COMMAND_LABEL} variant="icon" className="w-full" />
          <div className="flex flex-col">
            <CopyButton
              text={CLOSING_PROMPT}
              successMessage={CLOSING_PROMPT_SUCCESS_MESSAGE}
              errorMessage={CLOSING_PROMPT_ERROR_MESSAGE}
              showTextOnError
              className="flex h-10 w-full items-center justify-center rounded-lg bg-sapien-surface p-2 text-[15px] leading-none font-medium tracking-tight text-white hover:bg-sapien-raised"
            >
              {CLOSING_PROMPT_LABEL}
            </CopyButton>
          </div>
        </div>
      </div>
      {/*
        Below sm: Figma's mobile frame, a 320×396 box (24px corner angles) scaled to the
        content width, up to 460px where the card reaches its desktop size. From sm: the
        desktop stage, Figma x=369…960 of the 540px section, pinned to the section's
        bottom-right so the arm's clipped edge sits on the rail.
      */}
      <div
        aria-hidden="true"
        className="@container pointer-events-none relative mx-auto mt-[71px] aspect-[320/396] w-full max-w-[460px] sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:aspect-auto sm:h-135 sm:w-[591px] sm:max-w-none"
      >
        <div className="absolute top-0 left-0 h-[396px] w-80 origin-top-left max-sm:[scale:tan(atan2(100cqw,320px))] sm:size-full">
          <Artwork asset={assets.anglesMobile} className="absolute -top-px -left-px h-[398px] w-[322px] sm:hidden" />
          <Artwork
            asset={assets.angles}
            className="absolute top-[15px] left-[142px] h-[500px] w-[434px] max-sm:hidden"
          />
          {/* The 590×462 art box (Figma x=369, y=76); mobile shows it at 0.695798. */}
          <div className="absolute top-[58.541px] left-[-57.609px] h-[462px] w-[590px] origin-top-left scale-[0.695798] sm:top-[76px] sm:left-0 sm:scale-100">
            <div className="absolute top-[-250.654px] left-[-119.654px] h-[595.307px] w-[810.309px]" style={cardMask}>
              <div className="absolute top-[250.654px] left-[225.654px] rounded-[19.062px] shadow-[0_-3.177px_15.885px_rgba(0,0,0,0.45)]">
                <AgentIdCard surface="flat" />
              </div>
            </div>
            <Artwork asset={assets.robotArm} className="absolute top-[43px] left-0 h-[419px] w-[590px]" />
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}
