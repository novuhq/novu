import { resolveHumanDashboardBaseUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';
import type { RelaySender } from '../services/relay-owner-name';

export type HumanEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/** The agent as its emails show it. `pictureUrl` is always set: an agent with no picture gets the default one. */
export type HumanEmailSender = RelaySender & { pictureUrl: string };

export type HumanEmailRecipient = { name?: string; firstName?: string };

export type HumanEmailParties = { sender: HumanEmailSender; recipient: HumanEmailRecipient };

export const COLORS = {
  canvas: '#F5F3EF',
  card: '#FFFFFF',
  box: '#FAF8F5',
  border: '#E7E2DA',
  ink: '#1A1714',
  text: '#4A443D',
  muted: '#8A8279',
  accent: '#FF5C30',
  accentSoft: '#FEF4F0',
} as const;

const SANS = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export const TYPE = {
  title: `font-family:${SANS};font-size:26px;line-height:32.5px;font-weight:500;letter-spacing:-0.39px;color:${COLORS.ink};`,
  body: `font-family:${SANS};font-size:15px;line-height:24px;font-weight:400;color:${COLORS.text};`,
  small: `font-family:${SANS};font-size:12px;line-height:18px;font-weight:400;color:${COLORS.muted};`,
  fallback: `font-family:${SANS};font-size:13px;line-height:20px;font-weight:400;color:${COLORS.muted};`,
  label: `font-family:${SANS};font-size:15px;line-height:20px;font-weight:500;`,
  name: `font-family:${SANS};font-size:14px;line-height:18px;font-weight:500;color:${COLORS.ink};`,
  meta: `font-family:${SANS};font-size:13px;line-height:17px;font-weight:400;color:${COLORS.muted};`,
  hint: `font-family:${SANS};font-size:14px;line-height:18px;font-weight:400;color:${COLORS.ink};`,
  bullet: `font-family:${SANS};font-size:13px;line-height:18px;font-weight:400;color:${COLORS.accent};`,
  heading: `font-family:${SANS};font-size:20px;line-height:25px;font-weight:500;letter-spacing:-0.3px;color:${COLORS.ink};`,
  boxText: `font-family:${SANS};font-size:14px;line-height:22px;font-weight:400;color:${COLORS.text};`,
  tag: `font-family:${SANS};font-size:10px;line-height:13px;font-weight:500;letter-spacing:0.8px;color:${COLORS.accent};`,
  senderName: `font-family:${SANS};font-size:15px;line-height:20px;font-weight:500;color:${COLORS.ink};`,
  actionTitle: `font-family:${SANS};font-size:16px;line-height:22px;font-weight:500;color:${COLORS.ink};`,
  option: `font-family:${SANS};font-size:15px;line-height:20px;font-weight:400;color:${COLORS.ink};`,
} as const;

const WORDMARK = {
  logo: `font-family:${MONO};font-size:13px;line-height:17px;font-weight:400;color:${COLORS.ink};text-decoration:none;`,
  footer: `font-family:${MONO};font-size:12px;line-height:16px;font-weight:400;color:${COLORS.ink};text-decoration:none;`,
};

const CARD_GAP = 20;
/** The design leaves more air under the logo: a 4px spacer between two gaps. */
const LOGO_GAP = 44;
const CARD_TO_FOOTER = 20;
const FOOTER_GAP = 10;

export const TABLE = 'role="presentation" cellspacing="0" cellpadding="0" border="0"';

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The agent in a sentence: "Atlas", or "your agent" while it still has the placeholder name. */
export function agentInSentence(sender: Pick<RelaySender, 'agentName'>): string {
  return sender.agentName ?? 'your agent';
}

/** The agent at the start of a sentence: "Atlas", or "Your agent". */
export function agentAtStart(sender: Pick<RelaySender, 'agentName'>): string {
  return sender.agentName ?? 'Your agent';
}

/** "AI agent · run by Dima Grossman", or just "AI agent" with no name for the operator. */
export function agentSubline(sender: Pick<RelaySender, 'operatorName'>): string {
  return sender.operatorName ? `AI agent · run by ${sender.operatorName}` : 'AI agent';
}

export function greeting(firstName: string | undefined): string {
  return firstName ? `Hi ${firstName},` : 'Hi,';
}

function assetUrl(path: string): string {
  return `${resolveHumanDashboardBaseUrl()}${path}`;
}

/** A bare `agentinbox.md` turns into a blue link in Gmail, so the wordmark is a link of its own. */
function wordmark(style: string): string {
  return `<a href="${assetUrl('')}" style="${style}">agentinbox<span style="color:${COLORS.accent};">.md</span></a>`;
}

function logomark(size: number): string {
  return `<img src="${assetUrl('/brand/agentinbox-mark.png')}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border:0;" />`;
}

function logo(): string {
  return [
    `<table ${TABLE}><tr>`,
    `<td valign="middle" style="padding-right:8px;">${logomark(18)}</td>`,
    `<td valign="middle">${wordmark(WORDMARK.logo)}</td>`,
    '</tr></table>',
  ].join('');
}

/** A round agent picture. Outlook on Windows shows it square. */
export function agentPicture(pictureUrl: string, size: number): string {
  return `<img src="${escapeHtml(pictureUrl)}" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border:0;border-radius:${size / 2}px;background-color:${COLORS.ink};" />`;
}

export function paragraphs(lines: string[]): string {
  return lines
    .map((line, index) => `<p style="margin:0${index < lines.length - 1 ? ' 0 10px' : ''};${TYPE.body}">${line}</p>`)
    .join('');
}

/** An address spelled out in the text. Gmail would make it a blue link; this keeps its colour. */
export function strongAddress(address: string): string {
  const escaped = escapeHtml(address);

  return `<a href="mailto:${escaped}" style="color:${COLORS.ink};font-weight:500;text-decoration:none;">${escaped}</a>`;
}

export function primaryButton(label: string, href: string): string {
  return [
    `<table ${TABLE}><tr>`,
    `<td bgcolor="${COLORS.ink}" style="background-color:${COLORS.ink};border-radius:8px;">`,
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;${TYPE.label}color:#FFFFFF;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>`,
    '</td></tr></table>',
  ].join('');
}

export function secondaryButton(label: string, href: string): string {
  return [
    `<table ${TABLE}><tr>`,
    `<td bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:8px;">`,
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;${TYPE.label}color:${COLORS.ink};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>`,
    '</td></tr></table>',
  ].join('');
}

/** The warm box that sets a part of the email apart. */
export function box(content: string, padding: string): string {
  return [
    `<table ${TABLE} width="100%">`,
    `<tr><td bgcolor="${COLORS.box}" style="background-color:${COLORS.box};border:1px solid ${COLORS.border};border-radius:12px;padding:${padding};">`,
    content,
    '</td></tr></table>',
  ].join('');
}

export function divider(): string {
  return `<table ${TABLE} width="100%"><tr><td height="1" bgcolor="${COLORS.border}" style="height:1px;line-height:1px;font-size:1px;background-color:${COLORS.border};">&nbsp;</td></tr></table>`;
}

/** The reply prompt: the arrow is a text glyph, kept from turning into an emoji. */
export function replyHint(text: string, radius = 10): string {
  return [
    `<table ${TABLE}><tr>`,
    `<td bgcolor="${COLORS.accentSoft}" style="background-color:${COLORS.accentSoft};border-radius:${radius}px;padding:12px 14px;">`,
    `<table ${TABLE}><tr>`,
    `<td valign="middle" style="padding-right:10px;${TYPE.hint}color:${COLORS.accent};">&#x21A9;&#xFE0E;</td>`,
    `<td valign="middle" style="${TYPE.hint}">${escapeHtml(text)}</td>`,
    '</tr></table>',
    '</td></tr></table>',
  ].join('');
}

/** Blocks one under the other, `gap` apart. A block can ask for its own gap above it. */
export function stack(blocks: Array<string | { html: string; gap: number }>, gap: number): string {
  const rows = blocks.map((block, index) => {
    const html = typeof block === 'string' ? block : block.html;
    const top = typeof block === 'string' ? gap : block.gap;

    return `<tr><td${index > 0 ? ` style="padding-top:${top}px;"` : ''}>${html}</td></tr>`;
  });

  return `<table ${TABLE} width="100%">${rows.join('')}</table>`;
}

function sentWith(): string {
  return [
    `<table ${TABLE} align="center"><tr>`,
    `<td valign="middle" style="padding-right:6px;font-family:${SANS};font-size:12px;line-height:16px;color:${COLORS.muted};">Sent with</td>`,
    `<td valign="middle" style="padding-right:6px;">${logomark(13)}</td>`,
    `<td valign="middle">${wordmark(WORDMARK.footer)}</td>`,
    '</tr></table>',
  ].join('');
}

function footer(line: string | undefined): string {
  const blocks = [
    ...(line ? [`<p style="margin:0;${TYPE.small}text-align:center;">${escapeHtml(line)}</p>`] : []),
    sentWith(),
  ];

  return stack(blocks, FOOTER_GAP);
}

/** The card stack of an email that opens with the logo. */
export function cardWithLogo(blocks: Array<string | { html: string; gap: number }>): string {
  const [first, ...rest] = blocks;

  return stack(
    [logo(), { html: typeof first === 'string' ? first : (first?.html ?? ''), gap: LOGO_GAP }, ...rest],
    CARD_GAP
  );
}

/**
 * The frame of every Agent Inbox email: a white card on a warm grey page, with its footer underneath. Light only:
 * the design has no dark version, and without the `color-scheme` hints mail apps invert the colours themselves.
 */
export function emailDocument(params: { card: string; footerLine?: string; cardPadding?: string }): string {
  const fonts = [
    `@font-face{font-family:Geist;font-weight:100 900;font-display:swap;src:url(${assetUrl('/fonts/geist-latin.woff2')}) format('woff2');}`,
    `@font-face{font-family:'Geist Mono';font-weight:400;font-display:swap;src:url(${assetUrl('/fonts/geist-mono-regular.woff2')}) format('woff2');}`,
  ].join('');
  // The design's 40px padding leaves little room for text on a phone.
  const responsive =
    '@media only screen and (max-width:600px){.page{padding:16px 12px !important;}.card{padding:28px 20px !important;}}';

  return [
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '<meta name="color-scheme" content="light only"/>',
    '<meta name="supported-color-schemes" content="light only"/>',
    `<style>:root{color-scheme:light only;}${fonts}${responsive}</style>`,
    '</head>',
    `<body style="margin:0;padding:0;background-color:${COLORS.canvas};">`,
    `<table ${TABLE} width="100%" bgcolor="${COLORS.canvas}" style="background-color:${COLORS.canvas};">`,
    '<tr><td align="center" class="page" style="padding:32px 16px;">',
    `<table ${TABLE} width="100%" style="max-width:560px;">`,
    `<tr><td class="card" bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;padding:${params.cardPadding ?? '40px'};">`,
    params.card,
    '</td></tr>',
    `<tr><td style="padding-top:${CARD_TO_FOOTER}px;">${footer(params.footerLine)}</td></tr>`,
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');
}

export function titleBlock(text: string): string {
  return `<h1 style="margin:0;${TYPE.title}">${escapeHtml(text)}</h1>`;
}

export function smallPrint(text: string): string {
  return `<p style="margin:0;${TYPE.small}">${escapeHtml(text)}</p>`;
}
