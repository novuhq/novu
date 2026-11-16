'use client';

import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

import { CopyButton } from '@/components/ui/copy-button';
import type { AgentLook } from '@/lib/look';

import { CardArt } from './card-art';

type AgentCardMiniProps = {
  look: AgentLook;
  name: string;
  address: string;
  /** Its public card's link, which Copy URL copies and the QR code holds. */
  cardLink: string;
  /** Where the mascot sits on the art: the onboarding's travelling mascot, or the card's own. */
  mascot: ReactNode;
};

/**
 * The agent card as a chat shows it (`Card widget` in A.4): on its left a crop of the vertical card's art with the
 * mascot on it, then "Agent card", the name, the address and Copy URL, and on its right a code to scan.
 */
export function AgentCardMini({ look, name, address, cardLink, mascot }: AgentCardMiniProps) {
  return (
    <article className="flex w-full max-w-[491px] overflow-hidden rounded-[14px] border border-[#2e2e2e] bg-[#0c0c0c]">
      {/* `Portrait`: the vertical card at 0.904 of its size, showing the lower part of its art. */}
      <div aria-hidden="true" className="relative w-37 shrink-0 self-stretch overflow-hidden bg-[#110f0e]">
        <CardArt
          kind={look.art.kind}
          seed={look.art.seed}
          color={look.color}
          className="absolute top-[-102.4px] left-[-12px] aspect-[100/84] w-[271.2px]"
        />
        <div className="absolute top-[72.71px] left-[9.02px] w-20">{mascot}</div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1 px-5 py-4 sm:w-62.5 sm:flex-none">
        <p className="font-mono text-[10px] leading-[13px] tracking-[0.8px] text-foreground/45 uppercase">Agent card</p>
        <h3 className="max-w-full truncate font-display text-[30px] leading-[39px] text-foreground italic">{name}</h3>
        <p className="max-w-full truncate font-mono text-xs leading-4 text-foreground/75">{address}</p>
        <div className="mt-3.5 flex h-7.5 items-center">
          <CopyButton
            value={cardLink}
            label={`Copy ${name}’s card link`}
            variant="secondary"
            labelOnly
            className="h-7 rounded-[7px] bg-foreground px-2.5 text-xs leading-4 font-medium text-background ring-0 hover:bg-white"
          >
            Copy URL
          </CopyButton>
        </div>
      </div>
      <figure className="hidden w-[91px] shrink-0 flex-col items-center justify-end gap-2 py-4 pr-4.5 sm:flex">
        <QRCode
          value={cardLink}
          size={56}
          bgColor="transparent"
          fgColor="#d8e7ea"
          level="L"
          aria-label={`QR code of ${cardLink}`}
        />
        <figcaption className="font-mono text-[7.232px] leading-[9px] font-medium tracking-[0.542px] whitespace-nowrap text-foreground/45 uppercase">
          Scan to message
        </figcaption>
      </figure>
    </article>
  );
}
