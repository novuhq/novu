import type { RelaySender } from '../services/relay-owner-name';
import {
  agentAtStart,
  agentInSentence,
  agentPicture,
  agentSubline,
  box,
  COLORS,
  cardWithLogo,
  divider,
  emailDocument,
  escapeHtml,
  greeting,
  type HumanEmailContent,
  paragraphs,
  primaryButton,
  secondaryButton,
  smallPrint,
  stack,
  strongAddress,
  TABLE,
  TYPE,
  titleBlock,
} from './human-email-layout';

type VerificationEmailParams = {
  sender: RelaySender & { pictureUrl: string };
  /** The first name of whoever gets the email. */
  inviteeName?: string;
  /** The address being confirmed. */
  address: string;
  /** The address the agent writes from. */
  agentAddress?: string;
  verifyUrl: string;
  claimUrl?: string;
  isOperatorVerification?: boolean;
};

const LINK_LIFETIME = 'The link works for 24 hours.';

/**
 * Builds the double-opt-in email: "Confirm your email" for the operator, with the claim box on a keyless setup,
 * and "Atlas wants to reach you" for anyone else. Agent Inbox branding only, no Novu watermark.
 */
export function buildHumanVerificationEmail(params: VerificationEmailParams): HumanEmailContent {
  return params.isOperatorVerification ? buildConfirmEmail(params) : buildInviteEmail(params);
}

function buildConfirmEmail(params: VerificationEmailParams): HumanEmailContent {
  const { sender, address, verifyUrl, claimUrl } = params;
  const hello = greeting(params.inviteeName);
  const agent = agentInSentence(sender);
  const smallText = `${LINK_LIFETIME} Didn’t sign up? Ignore this. ${agentAtStart(sender)} will cope.`;
  const reason = `so ${agent} knows where to find you when it needs a human.`;

  const card = cardWithLogo([
    titleBlock('Confirm your email'),
    paragraphs([escapeHtml(hello), `Confirm ${strongAddress(address)} ${escapeHtml(reason)}`]),
    primaryButton('Confirm email', verifyUrl),
    // The design leaves out the paste line next to the claim box, which already has plenty to read.
    claimUrl ? claimBox(claimUrl, sender) : pasteLine(verifyUrl),
    divider(),
    smallPrint(smallText),
  ]);

  return {
    subject: 'Confirm your email',
    html: emailDocument({ card }),
    text: [
      hello,
      '',
      `Confirm ${address} ${reason}`,
      '',
      `Confirm email: ${verifyUrl}`,
      '',
      ...(claimUrl ? claimText(claimUrl, sender) : []),
      smallText,
    ].join('\n'),
  };
}

function buildInviteEmail(params: VerificationEmailParams): HumanEmailContent {
  const { sender, verifyUrl } = params;
  const hello = greeting(params.inviteeName);
  const title = `${sender.agentName ?? sender.operatorName ?? 'Someone'} wants to reach you`;
  const intro = `${who(sender)} Confirm this is your email and its messages will land here. Reply like you would to anyone. It reads everything.`;

  const card = cardWithLogo([
    titleBlock(title),
    agentCard(params),
    paragraphs([escapeHtml(hello), escapeHtml(intro)]),
    primaryButton('Confirm email', verifyUrl),
    pasteLine(verifyUrl),
    divider(),
    smallPrint(LINK_LIFETIME),
  ]);

  return {
    subject: title,
    html: emailDocument({ card, footerLine: onBehalfLine(sender) }),
    text: [hello, '', intro, '', `Confirm email: ${verifyUrl}`, '', LINK_LIFETIME].join('\n'),
  };
}

function who(sender: RelaySender): string {
  if (sender.agentName && sender.operatorName) {
    return `${sender.agentName} is an AI agent working for ${sender.operatorName}.`;
  }

  if (sender.operatorName) {
    return `This is an AI agent working for ${sender.operatorName}.`;
  }

  return sender.agentName ? `${sender.agentName} is an AI agent.` : 'This is an AI agent.';
}

function onBehalfLine(sender: RelaySender): string {
  const typist = `${sender.agentName ?? 'An AI agent'} did the typing.`;

  return sender.operatorName ? `Sent on behalf of ${sender.operatorName}. ${typist}` : typist;
}

/** The agent's card in the invite: picture, name and who runs it, and its address on the right. */
function agentCard({ sender, agentAddress }: VerificationEmailParams): string {
  return box(
    [
      `<table ${TABLE} width="100%"><tr>`,
      `<td valign="middle" width="40" style="padding-right:12px;">${agentPicture(sender.pictureUrl, 40)}</td>`,
      '<td valign="middle">',
      `<p style="margin:0 0 2px;${TYPE.name}">${escapeHtml(sender.agentName ?? 'AI agent')}</p>`,
      `<p style="margin:0;${TYPE.meta}">${escapeHtml(agentSubline(sender))}</p>`,
      '</td>',
      agentAddress
        ? `<td valign="middle" align="right" style="${TYPE.small}line-height:16px;">${escapeHtml(agentAddress)}</td>`
        : '',
      '</tr></table>',
    ].join(''),
    '12px 14px'
  );
}

/** `agentinbox.md/verify/7Q4K…`: what the design shows of the link. The whole link is behind it. */
function shortLink(verifyUrl: string): string {
  try {
    const { host, pathname } = new URL(verifyUrl);
    const path = pathname.length > 12 ? `${pathname.slice(0, 12)}…` : pathname;

    return `${host}${path}`;
  } catch {
    return verifyUrl;
  }
}

function pasteLine(verifyUrl: string): string {
  const link = `<a href="${escapeHtml(verifyUrl)}" style="color:${COLORS.ink};text-decoration:underline;">${escapeHtml(shortLink(verifyUrl))}</a>`;

  return `<p style="margin:0;${TYPE.fallback}">Button being shy? Paste this link: ${link}</p>`;
}

function claimPerks(sender: RelaySender): string[] {
  const agent = agentInSentence(sender);

  return [
    `Keep ${agent}, its channels and contacts`,
    `Let ${agent} email the people you invite`,
    `Remove the 5-message demo limit (${agent} has a lot to say)`,
  ];
}

function claimIntro(sender: RelaySender): string {
  return `Right now ${agentInSentence(sender)} lives in a temporary workspace, like a houseguest. Claim it for free to:`;
}

function claimBox(claimUrl: string, sender: RelaySender): string {
  const perks = claimPerks(sender).map((perk, index) => {
    const gap = index > 0 ? 'padding-top:6px;' : '';

    return `<tr><td valign="top" width="18" style="${gap}${TYPE.bullet}">+</td><td style="${gap}${TYPE.hint}">${escapeHtml(perk)}</td></tr>`;
  });

  return box(
    stack(
      [
        `<table ${TABLE}><tr><td bgcolor="${COLORS.accentSoft}" style="padding:3px 8px;border-radius:999px;background-color:${COLORS.accentSoft};${TYPE.tag}">DEMO SETUP</td></tr></table>`,
        `<h2 style="margin:0;${TYPE.heading}">Make this setup yours</h2>`,
        `<p style="margin:0;${TYPE.boxText}">${escapeHtml(claimIntro(sender))}</p>`,
        `<table ${TABLE}>${perks.join('')}</table>`,
        secondaryButton('Claim setup →', claimUrl),
        smallPrint('Confirm your email first. Paperwork, we know.'),
      ],
      14
    ),
    '24px'
  );
}

function claimText(claimUrl: string, sender: RelaySender): string[] {
  return [
    claimIntro(sender),
    ...claimPerks(sender).map((perk) => `+ ${perk}`),
    '',
    `Claim setup: ${claimUrl}`,
    'Confirm your email first. Paperwork, we know.',
    '',
  ];
}
