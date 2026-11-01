import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import type { ReactNode } from 'react';

import { type AgentState, formatIssuedDate } from './agent-card';
import { drawMascot, MASCOT_AT_REST } from './mascot-sphere';
import { writtenLink } from './onboarding';

/** What Open Graph and X expect of a shared link's image. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * What the share image draws: the agent's card as its operator sees it on the Configure page, or as the
 * public card shows it to anyone.
 */
export type ShareImageCard = {
  name: string;
  handle: string;
  /** The agent's email address, or `null` while its email channel has none. */
  address: string | null;
  /** The public card's link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). Shown as `writtenLink` writes it. */
  cardLink: string;
  pictureUrl?: string;
  createdAt?: string;
  /** Who runs the agent, as the card names them: "Ada L.". Empty when there is no name to show. */
  operatorName: string;
  /** The operator's first name, for "Dima’s agent". Without one that line is left out. */
  operatorFirstName: string;
  state: AgentState;
  /** Telegram, once connected: its bot's `@username`, or `null` when that couldn't be read. */
  telegram: { bot: string | null } | null;
  /**
   * The lines only the Configure page's card has: the host behind the agent, and Slack. The public card
   * doesn't show them, and neither does its image (`undefined`).
   */
  host?: { connected: boolean };
  slack?: string | null;
};

/** The design's tokens, as `globals.css` names them. */
const COLOR = {
  background: '#0a0908',
  subtle: '#100f0d',
  raised: '#12110f',
  border: '#1f1d1a',
  borderStrong: '#2e2b27',
  foreground: '#ebe2d6',
  default: '#c4bcb0',
  secondary: '#8f887d',
  muted: '#5c574f',
  accent: '#ff5c30',
  success: '#1fc16b',
  warning: '#f2a838',
  telegram: '#26a5e4',
  onAccent: '#ffffff',
};

const STATE_DOT: Record<AgentState, string> = { active: COLOR.success, waiting: COLOR.warning, paused: COLOR.muted };

/**
 * The design draws the image as the Share dialog's 458 × 250 preview. The image is that preview at 1200
 * wide (× 2.62), its bottom 25px cut off to make 630: `p` takes the preview's sizes to the image's.
 */
const PREVIEW_SCALE = SHARE_IMAGE_SIZE.width / 458;
const p = (size: number) => size * PREVIEW_SCALE;

/** The card in it is the Configure page's 340px card at 55% of the preview: `c` takes the card's sizes. */
const CARD_SCALE = 0.55 * PREVIEW_SCALE;
const c = (size: number) => size * CARD_SCALE;

/**
 * The agent's card as an image to share (`og image · 1200 × 630` in the design): its name, whose agent it
 * is and how to reach it on the left, and its ID card, tilted, on the right. The Share dialog shows and
 * downloads it; the public card's page gives it to the apps its link is shared in.
 */
export async function renderShareImage(card: ShareImageCard, headers: Record<string, string>): Promise<ImageResponse> {
  const [assets, picture] = await Promise.all([loadAssets(), card.pictureUrl ? loadPicture(card.pictureUrl) : null]);

  return new ImageResponse(<ShareImage card={card} assets={assets} picture={picture} />, {
    ...SHARE_IMAGE_SIZE,
    fonts: assets.fonts,
    headers,
  });
}

type ShareImageProps = { card: ShareImageCard; assets: ShareImageAssets; picture: string | null };

function ShareImage({ card, assets, picture }: ShareImageProps) {
  const ways = [card.address && 'Email', card.telegram && 'Telegram', card.slack && 'Slack'].filter(Boolean);
  const oneLine = { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } as const;
  // As wide as the left column goes before the card: it starts at 221 of the preview.
  const columnWidth = p(190);

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: COLOR.subtle,
        fontFamily: 'Geist',
      }}
    >
      {/* `Illustration/texture-glow` at 36.46%, 80% strong: its dots show along the right and the bottom right. */}
      <img
        src={assets.glow}
        alt=""
        width={p(630)}
        height={p(420)}
        style={{ position: 'absolute', left: p(-40), top: p(-120), opacity: 0.8 }}
      />

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: p(24),
          top: p(70),
          width: columnWidth,
          fontSize: p(30),
          lineHeight: 39 / 30,
          color: COLOR.foreground,
          ...oneLine,
        }}
      >
        {card.name}
      </div>
      {card.operatorFirstName && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: p(24),
            top: p(108),
            width: columnWidth,
            fontFamily: 'Instrument Serif',
            fontStyle: 'italic',
            fontSize: p(22),
            lineHeight: 29 / 22,
            color: COLOR.accent,
            ...oneLine,
          }}
        >
          {`${card.operatorFirstName}’s agent`}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: p(24),
          top: p(150),
          width: columnWidth,
          fontFamily: 'Geist Mono',
          fontSize: p(12),
          lineHeight: 18 / 12,
          color: COLOR.secondary,
        }}
      >
        {ways.length > 0 && <div style={{ display: 'flex', ...oneLine }}>{ways.join(' · ')}</div>}
        <div style={{ display: 'flex', ...oneLine }}>{writtenLink(card.cardLink)}</div>
      </div>

      <MiniCard card={card} assets={assets} picture={picture} />
    </div>
  );
}

/**
 * The Configure page's `Agent ID card` at 55% of the preview, tilted 4° clockwise. Its unrotated box sits
 * where the design's rotated one has its centre; what runs past the bottom is cut off with the image.
 */
function MiniCard({ card, assets, picture }: ShareImageProps) {
  const issued = card.createdAt ? formatIssuedDate(card.createdAt, 'UTC') : null;
  // The Configure page's card has every line, set up or not; the public card only those that work.
  const everyLine = card.host !== undefined;
  // Without the operator's name, as `CardName` writes it: "Your agent" to the operator, "An agent" to anyone.
  const runBy = card.operatorName ? `Run by ${card.operatorName}` : everyLine ? 'Your agent' : 'An agent';
  const byline = [runBy, issued && `issued ${issued}`].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        left: p(230.4),
        top: p(32.2),
        width: c(340),
        height: c(491.9),
        transform: 'rotate(4deg)',
        transformOrigin: '50% 50%',
        // Nothing around the turned card clips (the image's own edges cut it off): the renderer misplaces such
        // a clip for the pictures laid out in its rows. The portrait and the footer round their own corners.
        borderRadius: c(14),
        border: `${c(1)}px solid ${COLOR.borderStrong}`,
        backgroundColor: COLOR.background,
        boxShadow: `0 ${p(16)}px ${p(32)}px 0 rgba(0, 0, 0, 0.5)`,
      }}
    >
      <Portrait card={card} assets={assets} picture={picture} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `${c(18)}px ${c(20)}px ${c(14)}px`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: c(22),
            lineHeight: 28 / 22,
            fontWeight: 500,
            letterSpacing: c(-0.3),
            color: COLOR.foreground,
          }}
        >
          {card.name}
        </div>
        <div style={{ display: 'flex', marginTop: c(4), fontSize: c(12), lineHeight: 16 / 12, color: COLOR.secondary }}>
          {byline}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: `0 ${c(12)}px ${c(8)}px` }}>
        <Line
          icon={<EmailLogo />}
          label={card.address ?? 'No address yet'}
          live={Boolean(card.address)}
          end={card.address ? <CopyIcon /> : <PendingRing />}
        />
        {card.host && (
          <Line
            icon={<HostIcon />}
            label={card.host.connected ? 'active' : 'Not connected'}
            live={card.host.connected}
            highlighted
            end={<Dot color={card.host.connected ? COLOR.success : COLOR.muted} />}
          />
        )}
        {(card.telegram || everyLine) && (
          <Line
            icon={<TelegramLogo />}
            label={card.telegram ? (card.telegram.bot ?? 'Connected') : 'Not set up'}
            live={Boolean(card.telegram)}
            end={card.telegram?.bot ? <CopyIcon /> : card.telegram ? <Dot color={COLOR.success} /> : <PendingRing />}
          />
        )}
        {card.slack !== undefined && (
          <Line
            icon={<SlackLogo />}
            label={card.slack ?? 'Not set up'}
            live={Boolean(card.slack)}
            end={card.slack ? <Dot color={COLOR.success} /> : <PendingRing />}
          />
        )}
      </div>

      <Footer cardLink={card.cardLink} />
    </div>
  );
}

function Portrait({ card, assets, picture }: ShareImageProps) {
  // The design's share preview draws the portrait without the card's code to scan.
  const label = { display: 'flex', position: 'absolute', fontFamily: 'Geist Mono', color: COLOR.muted } as const;

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flexShrink: 0,
        height: c(210),
        overflow: 'hidden',
        borderTopLeftRadius: c(13),
        borderTopRightRadius: c(13),
        backgroundColor: COLOR.subtle,
      }}
    >
      {/* `Deco/Callout dither` at 55%, its left edge 220px out of the card. */}
      <img
        src={assets.dither}
        alt=""
        width={c(560)}
        height={c(320)}
        style={{ position: 'absolute', top: 0, left: c(-220), opacity: 0.55 }}
      />
      {/* What shows of `Deco/Corner ticks`. */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: c(5),
          height: c(1),
          backgroundColor: COLOR.borderStrong,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: c(1),
          height: c(5),
          backgroundColor: COLOR.borderStrong,
        }}
      />

      <div
        style={{
          ...label,
          top: c(14),
          left: c(16),
          fontSize: c(10),
          lineHeight: 14 / 10,
          fontWeight: 500,
          letterSpacing: c(0.8),
        }}
      >
        AGENT CARD
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          position: 'absolute',
          top: c(12),
          right: c(12),
          padding: `${c(3)}px ${c(8)}px`,
          borderRadius: c(4),
          backgroundColor: 'rgba(10, 9, 8, 0.7)',
          fontFamily: 'Geist Mono',
          fontSize: c(11),
          lineHeight: 14 / 11,
          color: COLOR.default,
        }}
      >
        <Dot color={STATE_DOT[card.state]} />
        <div style={{ display: 'flex', marginLeft: c(6) }}>{card.state}</div>
      </div>

      {picture ? (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: c(40),
            left: c(104),
            width: c(132),
            height: c(132),
            overflow: 'hidden',
            borderRadius: '50%',
            border: `${c(1)}px solid rgba(46, 43, 39, 0.6)`,
          }}
        >
          <img src={picture} alt="" width={c(132)} height={c(132)} style={{ objectFit: 'cover' }} />
        </div>
      ) : (
        <img
          src={card.state === 'paused' ? assets.mascotAsleep : assets.mascotHappy}
          alt=""
          width={c(132)}
          height={c(132)}
          style={{ position: 'absolute', top: c(40), left: c(104) }}
        />
      )}

      <div style={{ ...label, bottom: c(8), left: c(16), fontSize: c(10), lineHeight: 14 / 10 }}>
        {`fig. ${card.handle}`}
      </div>
    </div>
  );
}

type LineProps = { icon: ReactNode; label: string; live: boolean; highlighted?: boolean; end: ReactNode };

function Line({ icon, label, live, highlighted = false, end }: LineProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        height: c(34),
        padding: `0 ${c(8)}px`,
        borderRadius: c(6),
        backgroundColor: highlighted ? COLOR.subtle : 'transparent',
      }}
    >
      {icon}
      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          marginLeft: c(10),
          marginRight: c(10),
          fontFamily: 'Geist Mono',
          fontSize: c(12),
          lineHeight: 16 / 12,
          color: live ? COLOR.foreground : COLOR.muted,
        }}
      >
        {label}
      </div>
      {end}
    </div>
  );
}

function Footer({ cardLink }: { cardLink: string }) {
  const button = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: c(28),
    borderRadius: c(4),
    border: `${c(1)}px solid ${COLOR.border}`,
    backgroundColor: COLOR.background,
  } as const;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 'auto',
        padding: `${c(12)}px ${c(14)}px`,
        borderTop: `${c(1)}px solid ${COLOR.border}`,
        borderBottomLeftRadius: c(13),
        borderBottomRightRadius: c(13),
        backgroundColor: 'rgba(16, 15, 13, 0.9)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          fontFamily: 'Geist Mono',
          fontSize: c(12),
          lineHeight: 16 / 12,
          color: COLOR.default,
        }}
      >
        {writtenLink(cardLink)}
      </div>
      <div style={{ ...button, width: c(28), marginLeft: c(8) }}>
        <Glyph src={icon(LUCIDE.copy, COLOR.foreground)} size={c(16)} />
      </div>
      <div style={{ ...button, marginLeft: c(8), padding: `0 ${c(10)}px` }}>
        <Glyph src={icon(LUCIDE.share, COLOR.foreground)} size={c(14)} />
        <div
          style={{
            display: 'flex',
            marginLeft: c(6),
            fontSize: c(13),
            lineHeight: 18 / 13,
            fontWeight: 500,
            color: COLOR.foreground,
          }}
        >
          Share card
        </div>
      </div>
    </div>
  );
}

/** The design's `Channel logo` for email at 16px: the envelope on the orange circle. */
function EmailLogo() {
  return (
    <Badge color={COLOR.accent}>
      <Glyph src={icon(LUCIDE.mail, COLOR.onAccent)} size={c(9)} />
    </Badge>
  );
}

function TelegramLogo() {
  return (
    <Badge color={COLOR.telegram}>
      {/* A pixel left of the middle, as `ChannelIcon` sets the plane. */}
      <Glyph src={svgImage(TELEGRAM_MARK)} size={c(10)} style={{ marginLeft: -c(2) }} />
    </Badge>
  );
}

function SlackLogo() {
  return (
    <Badge>
      <Glyph src={svgImage(SLACK_MARK)} size={c(12)} />
    </Badge>
  );
}

function Badge({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: c(16),
        height: c(16),
        borderRadius: '50%',
        backgroundColor: color ?? 'transparent',
      }}
    >
      {children}
    </div>
  );
}

/** The host's line: a bot in a small box. */
function HostIcon() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: c(16),
        height: c(16),
        borderRadius: c(4),
        border: `${c(1)}px solid ${COLOR.borderStrong}`,
        backgroundColor: COLOR.raised,
      }}
    >
      <Glyph src={icon(LUCIDE.bot, COLOR.muted, 1.5)} size={c(10)} />
    </div>
  );
}

function CopyIcon() {
  return <Glyph src={icon(LUCIDE.copy, COLOR.muted)} size={c(12)} />;
}

/** A small drawing that sits in a row: held at its size, where the row would otherwise squeeze it. */
function Glyph({ src, size, style }: { src: string; size: number; style?: { marginLeft: number } }) {
  return (
    <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, flexShrink: 0, ...style }} />
  );
}

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{ display: 'flex', flexShrink: 0, width: c(6), height: c(6), borderRadius: '50%', backgroundColor: color }}
    />
  );
}

function PendingRing() {
  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        width: c(7),
        height: c(7),
        borderRadius: '50%',
        border: `${c(1.2)}px solid ${COLOR.muted}`,
      }}
    />
  );
}

/** The Lucide icons the card uses, as the icon set draws them on its 24px grid. */
const LUCIDE = {
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  share:
    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
};

/** The marks of `ChannelIcon`, drawn the same way. */
const TELEGRAM_MARK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${COLOR.onAccent}"><path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.6-1.3Z"/></svg>`;

const SLACK_MARK = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">',
  '<path fill="#e01e5a" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>',
  '<path fill="#36c5f0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>',
  '<path fill="#2eb67d" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>',
  '<path fill="#ecb22e" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>',
  '</svg>',
].join('');

function icon(nodes: string, stroke: string, strokeWidth = 2): string {
  return svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`
  );
}

function svgImage(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * The mascot as the card draws it on its canvas (`MascotFace`, 120px grid), happy or asleep, turned into
 * an SVG of its pixels. That stays crisp at any size, so the image draws it as large as the design's 132px
 * `Human/Mascot`, where the page keeps it at the 120px of its grid.
 */
function mascotImage(asleep: boolean): string {
  const grid = 120;
  const pixels = new Uint8ClampedArray(grid * grid * 4);
  drawMascot(pixels, grid, { ...MASCOT_AT_REST, joy: asleep ? 0 : 1 }, 0.308, asleep ? 'asleep' : 'awake', {
    ahead: true,
  });

  // One path per colour, made of the runs of that colour along each row.
  const runs = new Map<string, string[]>();
  for (let row = 0; row < grid; row += 1) {
    let column = 0;
    while (column < grid) {
      const offset = (row * grid + column) * 4;
      if (pixels[offset + 3] === 0) {
        column += 1;
        continue;
      }

      const colour = hexOf(pixels, offset);
      let end = column + 1;
      while (
        end < grid &&
        pixels[(row * grid + end) * 4 + 3] !== 0 &&
        hexOf(pixels, (row * grid + end) * 4) === colour
      ) {
        end += 1;
      }

      const run = `M${column} ${row}h${end - column}v1h-${end - column}z`;
      runs.set(colour, [...(runs.get(colour) ?? []), run]);
      column = end;
    }
  }

  const paths = [...runs].map(([colour, parts]) => `<path fill="${colour}" d="${parts.join('')}"/>`).join('');

  return svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges">${paths}</svg>`
  );
}

function hexOf(pixels: Uint8ClampedArray, offset: number): string {
  return `#${[pixels[offset], pixels[offset + 1], pixels[offset + 2]].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

type ShareImageFont = { name: string; data: Buffer; weight: 400 | 500; style: 'normal' | 'italic' };

type ShareImageAssets = {
  fonts: ShareImageFont[];
  glow: string;
  dither: string;
  mascotHappy: string;
  mascotAsleep: string;
};

/**
 * The fonts (the same families `next/font` gives the pages, as TrueType files the image renderer reads:
 * `assets/fonts`, under the SIL Open Font License) and the design's drawings from `public/illustrations`.
 * Read once and kept; a read that failed is tried again by the next image.
 */
let assets: Promise<ShareImageAssets> | null = null;

function loadAssets(): Promise<ShareImageAssets> {
  if (!assets) {
    assets = readAssets();
    assets.catch(() => {
      assets = null;
    });
  }

  return assets;
}

async function readAssets(): Promise<ShareImageAssets> {
  const read = (path: string) => readFile(join(process.cwd(), path));
  const [geist, geistMedium, mono, monoMedium, serif, glow, dither] = await Promise.all([
    read('assets/fonts/Geist-Regular.ttf'),
    read('assets/fonts/Geist-Medium.ttf'),
    read('assets/fonts/GeistMono-Regular.ttf'),
    read('assets/fonts/GeistMono-Medium.ttf'),
    read('assets/fonts/InstrumentSerif-Italic.ttf'),
    read('public/illustrations/texture-glow.svg'),
    read('public/illustrations/dither-callout.svg'),
  ]);

  return {
    fonts: [
      { name: 'Geist', data: geist, weight: 400, style: 'normal' },
      { name: 'Geist', data: geistMedium, weight: 500, style: 'normal' },
      { name: 'Geist Mono', data: mono, weight: 400, style: 'normal' },
      { name: 'Geist Mono', data: monoMedium, weight: 500, style: 'normal' },
      { name: 'Instrument Serif', data: serif, weight: 400, style: 'italic' },
    ],
    glow: `data:image/svg+xml;base64,${glow.toString('base64')}`,
    dither: `data:image/svg+xml;base64,${dither.toString('base64')}`,
    mascotHappy: mascotImage(false),
    mascotAsleep: mascotImage(true),
  };
}

/** The kinds of picture the image renderer can draw. */
const PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const PICTURE_TIMEOUT_MS = 3000;
const PICTURE_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The picture the operator gave the agent, as a data URL. It is the API's own address for it
 * (`/v1/human/agent-pictures/...`), public like the invite page that shows it too. `null` when it can't be
 * loaded in time, and the image shows the mascot instead.
 */
async function loadPicture(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS) });
    const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    if (!response.ok || !PICTURE_TYPES.includes(type)) {
      return null;
    }

    const body = Buffer.from(await response.arrayBuffer());

    return body.byteLength > PICTURE_MAX_BYTES ? null : `data:${type};base64,${body.toString('base64')}`;
  } catch (error) {
    console.error('Failed to load the agent’s picture for its share image', error);

    return null;
  }
}
