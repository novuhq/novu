import { expect } from 'chai';
import {
  adaptApprovalContentForReplyBasedPlatform,
  parseApprovalReplyVerdict,
  REPLY_APPROVAL_INSTRUCTIONS,
} from './reply-based-approval';

describe('parseApprovalReplyVerdict', () => {
  it('should approve once on unambiguous positive replies', () => {
    for (const text of ['yes', 'YES', ' Yes! ', 'y', 'approve', 'ok', 'Okay.', 'go ahead', 'Do it', '👍']) {
      expect(parseApprovalReplyVerdict(text), `expected "${text}" to approve`).to.equal('approve');
    }
  });

  it('should always-allow on unambiguous "always" replies', () => {
    for (const text of [
      'always',
      'ALWAYS',
      ' Always. ',
      'always allow',
      'allow always',
      'yes always',
      'always yes',
      'allow forever',
    ]) {
      expect(parseApprovalReplyVerdict(text), `expected "${text}" to always-allow`).to.equal('always_allow');
    }
  });

  it('should deny on unambiguous negative replies', () => {
    for (const text of ['no', 'No.', 'n', 'deny', 'ignore', 'cancel', 'Stop', "don't", '👎']) {
      expect(parseApprovalReplyVerdict(text), `expected "${text}" to deny`).to.equal('deny');
    }
  });

  it('should not consume hedged or unrelated replies', () => {
    for (const text of [
      'yes, but change the amount to $20',
      'always change the amount',
      'what does this tool do?',
      'maybe',
      'no rush',
      'yesterday',
      '',
      undefined,
      null,
    ]) {
      expect(parseApprovalReplyVerdict(text), `expected "${text}" to fall through`).to.equal(null);
    }
  });
});

describe('adaptApprovalContentForReplyBasedPlatform', () => {
  it('should strip callback buttons from a card and append the reply instructions', () => {
    const adapted = adaptApprovalContentForReplyBasedPlatform({
      card: {
        type: 'card',
        title: 'Tool approval required',
        children: [
          { type: 'text', content: 'issueRefund: { amount: 50 }' },
          {
            type: 'actions',
            children: [
              { type: 'button', id: 'tool-approval:deny:a1', label: 'Deny' },
              { type: 'button', id: 'tool-approval:approve:a1', label: 'Approve' },
            ],
          },
        ],
      },
    });

    const children = adapted.card?.children as Array<Record<string, unknown>>;
    expect(children.some((child) => child.type === 'actions')).to.equal(false);
    expect(children.at(-1)).to.deep.equal({ type: 'text', content: REPLY_APPROVAL_INSTRUCTIONS });
  });

  it('should keep link buttons since URLs still render on text-only platforms', () => {
    const adapted = adaptApprovalContentForReplyBasedPlatform({
      card: {
        type: 'card',
        children: [
          {
            type: 'actions',
            children: [
              { type: 'button', id: 'tool-approval:approve:a1', label: 'Approve' },
              { type: 'link-button', label: 'View details', url: 'https://example.com' },
            ],
          },
        ],
      },
    });

    const children = adapted.card?.children as Array<Record<string, unknown>>;
    const actions = children.find((child) => child.type === 'actions');
    expect(actions?.children).to.deep.equal([
      { type: 'link-button', label: 'View details', url: 'https://example.com' },
    ]);
  });

  it('should append the reply instructions to markdown content', () => {
    const adapted = adaptApprovalContentForReplyBasedPlatform({ markdown: 'Approve issueRefund?' });

    expect(adapted.markdown).to.equal(`Approve issueRefund?\n\n${REPLY_APPROVAL_INSTRUCTIONS}`);
  });
});
