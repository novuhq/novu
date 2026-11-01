import type { RelaySender } from '../services/relay-owner-name';
import {
  agentAtStart,
  agentInSentence,
  cardWithLogo,
  divider,
  emailDocument,
  escapeHtml,
  greeting,
  type HumanEmailContent,
  paragraphs,
  replyHint,
  smallPrint,
  titleBlock,
} from './human-email-layout';

const INTRO =
  'This is my first email from my very own inbox. Reply and I’ll get it. That finishes setup, and it’s also my first conversation, so no pressure.';
const HINT = 'Just hit reply. Even “hi” counts.';
const SMALL_PRINT = 'Sent as a test from your Agent Inbox setup. Yes, it’s a real email.';

/** The onboarding test, in the same frame as every Agent Inbox email. No Novu watermark. */
export function buildHumanTestEmail(params: { sender: RelaySender; operatorFirstName?: string }): HumanEmailContent {
  const { sender } = params;
  const title = `Hi, I’m ${agentInSentence(sender)}`;
  const hello = greeting(params.operatorFirstName);
  const operator = sender.operatorName ? ` run by ${sender.operatorName}` : '';
  const footerLine = `${agentAtStart(sender)} is an AI agent${operator}. It was very excited to send this.`;

  const card = cardWithLogo([
    titleBlock(title),
    paragraphs([escapeHtml(hello), escapeHtml(INTRO)]),
    replyHint(HINT),
    divider(),
    smallPrint(SMALL_PRINT),
  ]);

  return {
    subject: title,
    html: emailDocument({ card, footerLine }),
    text: [hello, '', INTRO, '', HINT, '', SMALL_PRINT].join('\n'),
  };
}
