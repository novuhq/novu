import type { CardNode, EmailLayoutMessage } from '@novu/chat-adapter-email';
import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import { buildHumanAgentEmail } from './human-agent-email.template';

const parties = {
  sender: {
    agentName: 'Atlas',
    operatorName: 'Dima Grossman',
    pictureUrl: 'https://agentinbox.md/api/v1/agent-pictures/env/agent/v1',
  },
  recipient: { name: 'Maya Levi', firstName: 'Maya' },
};

function message(overrides: Partial<EmailLayoutMessage>): EmailLayoutMessage {
  return {
    threadId: 'email:thread',
    text: 'Fallback',
    renderMarkdown: (markdown) => `<p>${markdown.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`,
    ...overrides,
  };
}

function waitingCard(kind: HumanInteractionKindEnum, buttons: CardNode[], body = 'Your call, I just work here.') {
  return {
    type: 'card',
    humanKind: kind,
    title: 'Send a $45 refund for order #2231?',
    children: [
      { type: 'text', content: body },
      ...(buttons.length > 0 ? [{ type: 'actions', children: buttons }] : []),
    ],
  } as CardNode;
}

const approve = { type: 'button', label: 'Approve', style: 'primary', url: 'https://agentinbox.md/email-action?t=a' };
const deny = { type: 'button', label: 'Deny', style: 'default', url: 'https://agentinbox.md/email-action?t=d' };

describe('buildHumanAgentEmail', () => {
  it('lays out an approval with its label, question and two buttons', () => {
    const { html, text, subject } = buildHumanAgentEmail({
      ...parties,
      message: message({ card: waitingCard(HumanInteractionKindEnum.APPROVE, [deny, approve]) }),
    });

    expect(subject).to.equal('Send a $45 refund for order #2231?');
    expect(html).to.include('AI agent · run by Dima Grossman');
    expect(html).to.include('Hi Maya,');
    expect(html).to.include('Your call, I just work here.');
    expect(html).to.include('APPROVAL');
    expect(html).to.include(parties.sender.pictureUrl);
    expect(html.indexOf('>Approve<')).to.be.lessThan(html.indexOf('>Deny<'));
    expect(text).to.include(`Approve: ${approve.url}`);
    expect(text).to.include(`Deny: ${deny.url}`);
  });

  it('never tells people that a reply answers an approval or a choice', () => {
    for (const kind of [HumanInteractionKindEnum.APPROVE, HumanInteractionKindEnum.CHOOSE]) {
      const { html, text } = buildHumanAgentEmail({
        ...parties,
        message: message({ card: waitingCard(kind, [approve, deny]) }),
      });

      expect(html).to.not.include('just reply');
      expect(html).to.not.include('Reply with');
      expect(text).to.not.include('Reply to this email');
    }
  });

  it('turns each option of a choice into a row', () => {
    const { html } = buildHumanAgentEmail({
      ...parties,
      message: message({
        card: waitingCard(HumanInteractionKindEnum.CHOOSE, [
          { type: 'button', label: 'Tue 28 Oct · 10:00', url: 'https://agentinbox.md/email-action?t=1' },
          { type: 'button', label: 'Wed 29 Oct · 14:30', url: 'https://agentinbox.md/email-action?t=2' },
        ]),
      }),
    });

    expect(html).to.include('CHOOSE ONE');
    expect(html).to.include('Tue 28 Oct · 10:00');
    expect(html).to.include('Wed 29 Oct · 14:30');
  });

  it('asks for a reply on a question, which a reply does answer', () => {
    const { html, text } = buildHumanAgentEmail({
      ...parties,
      message: message({ card: waitingCard(HumanInteractionKindEnum.ASK, []) }),
    });

    expect(html).to.include('QUESTION');
    expect(html).to.include('Reply to this email. I’ll use your words as is, typos included.');
    expect(text).to.include('Reply to this email.');
  });

  it('renders the Markdown of a body', () => {
    const { html } = buildHumanAgentEmail({
      ...parties,
      message: message({ card: waitingCard(HumanInteractionKindEnum.ASK, [], 'A **bold** move') }),
    });

    expect(html).to.include('>bold</strong>');
    expect(html).to.not.include('**bold**');
  });

  it('wraps a normal message in the frame, with no greeting added', () => {
    const { html, text, subject } = buildHumanAgentEmail({
      ...parties,
      message: message({ html: '<p>The <strong>deploy</strong> finished.</p>', text: 'The **deploy** finished.' }),
    });

    expect(subject).to.equal('The deploy finished.');
    expect(html).to.include('The <strong');
    expect(html).to.include('Atlas');
    expect(html).to.include('Sent with');
    expect(html).to.not.include('Hi Maya,');
    expect(text).to.include('The **deploy** finished.');
  });

  it('keeps the footer on a card with no kind, such as a notice with a button', () => {
    const card = {
      type: 'card',
      children: [
        { type: 'text', content: 'This inbox can receive email.' },
        { type: 'divider' },
        {
          type: 'actions',
          children: [
            { type: 'link-button', label: 'Sign up free', url: 'https://agentinbox.md/claim', style: 'primary' },
          ],
        },
      ],
    } as CardNode;
    const { html, text } = buildHumanAgentEmail({ ...parties, message: message({ card }) });

    expect(html).to.include('This inbox can receive email.');
    expect(html).to.include('>Sign up free</a>');
    expect(html).to.include('Replies go straight to Atlas');
    expect(html).to.not.include('Hi Maya,');
    expect(text).to.include('Sign up free: https://agentinbox.md/claim');
  });

  it('shortens a long first line for the subject', () => {
    const { subject } = buildHumanAgentEmail({
      ...parties,
      message: message({ html: '<p>x</p>', text: `${'word '.repeat(30)}\nSecond line` }),
    });

    expect(subject?.length).to.be.at.most(78);
    expect(subject?.endsWith('…')).to.equal(true);
  });

  it('greets with Hi, and stays generic when names are missing', () => {
    const { html } = buildHumanAgentEmail({
      sender: { pictureUrl: parties.sender.pictureUrl },
      recipient: {},
      message: message({ card: waitingCard(HumanInteractionKindEnum.ASK, []) }),
    });

    expect(html).to.include('Hi,');
    expect(html).to.include('Your agent is an AI agent. Replies go straight to your agent');
    expect(html).to.not.include('run by');
  });

  it('escapes what the agent and the people typed', () => {
    const { html } = buildHumanAgentEmail({
      sender: { ...parties.sender, agentName: 'Atlas <b>' },
      recipient: { firstName: 'Maya <i>' },
      message: message({ card: { ...waitingCard(HumanInteractionKindEnum.ASK, []), title: 'Why <script>?' } }),
    });

    expect(html).to.include('Atlas &lt;b&gt;');
    expect(html).to.include('Maya &lt;i&gt;');
    expect(html).to.include('Why &lt;script&gt;?');
  });

  it('has no Novu in it', () => {
    const { html, text } = buildHumanAgentEmail({
      ...parties,
      message: message({ card: waitingCard(HumanInteractionKindEnum.APPROVE, [approve, deny]) }),
    });

    expect(html.toLowerCase()).to.not.include('novu');
    expect(text.toLowerCase()).to.not.include('novu');
  });
});
