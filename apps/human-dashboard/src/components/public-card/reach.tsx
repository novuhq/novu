'use client';

import { ArrowUpRight, Check, Download, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import { buttonClassName } from '@/components/ui/button';
import { COPIED_MS, CopyButton } from '@/components/ui/copy-button';
import { toast } from '@/components/ui/toast';
import { qrValueOf } from '@/lib/agent-card';
import type { ChannelVia } from '@/lib/human-channels-api';
import type { PublicAgentCard } from '@/lib/public-agent-card';
import { cn } from '@/lib/utils';

import { ChannelMark } from './channel-mark';

/** One way to reach the agent, as its row in the list draws it. */
type Way = {
  via: ChannelVia;
  name: string;
  /** Under the name: where to find the agent there, its address or its bot. */
  detail: string;
  action: string;
  href: string;
};

/**
 * Beside the public card (`Reach` on `4 · Public card · visitor view`): "Reach atlas anywhere.", who runs the
 * agent, a row for each way to reach it that a visitor can open, and Copy link and Save QR. It rises in just
 * after the card.
 */
export function Reach({ card }: { card: PublicAgentCard }) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex w-full max-w-95 animate-rise-in flex-col items-start [animation-delay:80ms] motion-reduce:animate-none min-[880px]:w-95 min-[880px]:shrink-0"
    >
      {/* A handle can be 32 letters with no hyphen to break at, so these lines may break inside a word. */}
      <p className="font-mono text-[10px] leading-3.5 font-medium tracking-[0.8px] text-accent uppercase [overflow-wrap:anywhere]">
        Message {card.handle}
      </p>
      <h1 id={titleId} className="mt-3.5 text-[26px] leading-8 font-medium text-foreground [overflow-wrap:anywhere]">
        Reach {card.handle} anywhere.
      </h1>
      {/* Not in the design without an operator: the plainest sentence that leaves them out. */}
      <p className="mt-2.5 text-sm leading-5.25 text-secondary [overflow-wrap:anywhere]">
        {card.operatorName
          ? `${card.name} is ${card.operatorName}’s agent. It reads and replies on its own.`
          : `${card.name} is an agent. It reads and replies on its own.`}
      </p>

      <ul className="mt-7 w-full border-t border-border">
        {waysToReach(card).map((way) => (
          <WayRow key={way.via} way={way} />
        ))}
      </ul>

      {/* Only while it's true: today a stranger's first message reaches the agent straight away. */}
      {card.approvesNewPeople && (
        <p className="mt-4 flex items-center gap-2 text-xs leading-4 text-muted">
          <ShieldCheck aria-hidden="true" className="size-3.25 shrink-0" />
          {/* Not in the design without an operator: "the owner" stands in for their name. */}
          <span>Someone new? {card.operatorFirstName || 'The owner'} approves your first message.</span>
        </p>
      )}

      <div className="mt-8 flex items-center gap-4">
        <CopyButton
          value={card.cardLink}
          label="Copy the link to the card"
          variant="quiet"
          className={ACTION}
          iconClassName="size-3.25"
        >
          Copy link
        </CopyButton>
        <SaveQrButton handle={card.handle} address={card.address} />
      </div>
    </section>
  );
}

/**
 * The ways a visitor can reach the agent: email always, and Telegram with a bot. Slack isn't offered yet: the
 * API has no public link for a visitor to add the agent to their workspace.
 */
function waysToReach(card: PublicAgentCard): Way[] {
  const ways: Way[] = [
    {
      via: 'email',
      name: 'Email',
      detail: card.address,
      action: 'Email',
      href: `mailto:${card.address}`,
    },
  ];

  if (card.telegramBot) {
    ways.push({
      via: 'telegram',
      name: 'Telegram',
      detail: card.telegramBot,
      action: 'Chat',
      href: `https://t.me/${card.telegramBot.replace(/^@/, '')}`,
    });
  }

  return ways;
}

function WayRow({ way }: { way: Way }) {
  // An email opens the visitor's mail app; the others open the app's site in a new tab.
  const newTab = way.href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' };

  return (
    <li className="flex items-center gap-3.5 border-b border-border px-0.5 py-4">
      <ChannelMark via={way.via} size="row" />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <p className="text-sm leading-5 font-medium text-foreground">{way.name}</p>
        <p className="truncate font-mono text-xs leading-4 text-secondary">{way.detail}</p>
      </div>
      <a
        href={way.href}
        {...newTab}
        className="group flex shrink-0 items-center gap-1.5 rounded-sm text-[13px] leading-4.5 text-default transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
      >
        {way.action}
        {/* Nudged towards where it leads on hover; with reduced motion only its color changes. */}
        <ArrowUpRight
          aria-hidden="true"
          className="size-3.25 transition-transform duration-150 motion-safe:group-hover:translate-x-px motion-safe:group-hover:-translate-y-px motion-reduce:transition-none"
        />
      </a>
    </li>
  );
}

/** Copy link and Save QR: an icon and a word, quiet until hovered. */
const ACTION = 'h-4 gap-1.5 rounded-sm px-0 text-xs leading-4 font-normal text-secondary hover:bg-transparent';

/** How the saved code is drawn: 512px square, dark on white, with the 4 modules of white scanners need around it. */
const QR_IMAGE = { size: 512, quietModules: 4, dark: '#0a0908', light: '#ffffff' } as const;

type SaveStep = 'idle' | 'saving' | 'saved';

/**
 * Save QR: saves the card's code to scan, which starts an email to the agent, as `atlas-qr.png`. The image is
 * drawn in the browser from a copy of the code kept out of sight.
 */
function SaveQrButton({ handle, address }: { handle: string; address: string }) {
  const code = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<SaveStep>('idle');

  // The check mark shows as long as a copy button's does.
  useEffect(() => {
    if (step !== 'saved') {
      return;
    }

    const timer = setTimeout(() => setStep('idle'), COPIED_MS);

    return () => clearTimeout(timer);
  }, [step]);

  async function save() {
    const svg = code.current?.querySelector('svg');
    if (!svg || step === 'saving') {
      return;
    }

    setStep('saving');

    try {
      saveFile(await drawQrImage(svg), `${handle}-qr.png`);
      setStep('saved');
    } catch (error) {
      console.error('Failed to save the QR code', error);
      toast("Couldn't save the QR code. Try again.", 'error');
      setStep('idle');
    }
  }

  return (
    <>
      <button
        type="button"
        aria-busy={step === 'saving' || undefined}
        className={buttonClassName('quiet', cn(ACTION, step === 'saving' && 'cursor-progress'))}
        onClick={save}
      >
        <SaveIcon step={step} />
        Save QR
        <span aria-live="polite" className="sr-only">
          {step === 'saved' ? 'Saved' : ''}
        </span>
      </button>
      <div ref={code} hidden>
        <QRCode
          value={qrValueOf(address)}
          level="L"
          bgColor={QR_IMAGE.light}
          fgColor={QR_IMAGE.dark}
          shapeRendering="crispEdges"
        />
      </div>
    </>
  );
}

/** The download icon, which turns into a spinner while the image is made and a check mark once it's saved. */
function SaveIcon({ step }: { step: SaveStep }) {
  const layer =
    'col-start-1 row-start-1 size-3.25 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none';
  const hidden = 'scale-50 opacity-0';

  return (
    <span aria-hidden="true" className="inline-grid">
      <Download className={cn(layer, step !== 'idle' && hidden)} />
      <LoaderCircle className={cn(layer, 'animate-spin motion-reduce:animate-none', step !== 'saving' && hidden)} />
      <Check className={cn(layer, step !== 'saved' && hidden)} />
    </span>
  );
}

/**
 * The code as a PNG: each module a whole number of pixels, so its edges stay sharp, centred on the white
 * square with at least the quiet zone around it.
 */
async function drawQrImage(svg: SVGSVGElement): Promise<Blob> {
  const modules = svg.viewBox.baseVal.width;
  const moduleSize = Math.floor(QR_IMAGE.size / (modules + QR_IMAGE.quietModules * 2));
  const codeSize = modules * moduleSize;
  const offset = Math.floor((QR_IMAGE.size - codeSize) / 2);

  // Loaded rather than `decode()`d: some browsers won't decode an SVG that way.
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('The code could not be drawn'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = QR_IMAGE.size;
  canvas.height = QR_IMAGE.size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('The browser gave no canvas to draw the code on');
  }

  context.fillStyle = QR_IMAGE.light;
  context.fillRect(0, 0, QR_IMAGE.size, QR_IMAGE.size);
  context.drawImage(image, offset, offset, codeSize, codeSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The code could not be made a PNG'))),
      'image/png'
    );
  });
}

/** Saves a file the page made, under the name given. */
function saveFile(file: Blob, name: string) {
  const href = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // The browser has the file once the click went through; the address can go a moment later.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
