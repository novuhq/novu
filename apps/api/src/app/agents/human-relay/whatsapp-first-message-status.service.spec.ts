import { expect } from 'chai';
import sinon from 'sinon';
import { describeFailure, WhatsAppFirstMessageStatus } from './whatsapp-first-message-status.service';

describe('WhatsAppFirstMessageStatus', () => {
  const relay = { environmentId: 'env1', platform: 'whatsapp', isHumanRelay: true };
  const webhook = (statuses: unknown[]) => ({ entry: [{ changes: [{ field: 'messages', value: { statuses } }] }] });
  const billingPage =
    'https://business.facebook.com/billing_hub/accounts/details/?business_id=1&asset_id=2&wizard_name=CHANGE_COUNTRY_CURRENCY';
  const paymentFailure = {
    id: 'wamid.first',
    status: 'failed',
    errors: [
      {
        code: 131042,
        title: 'Business eligibility payment issue',
        error_data: {
          details: `Message failed to send because your WhatsApp Business account currency is not configured. Visit ${billingPage} to resolve this issue.`,
        },
        href: billingPage,
      },
    ],
  };

  function setup() {
    const repository = { recordHoldFailure: sinon.stub().resolves({ identifier: 'hi_1' }) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };

    return { status: new WhatsAppFirstMessageStatus(repository as never, logger as never), repository };
  }

  it('notes a failed first message on what it stood in for, in words the operator can act on', async () => {
    const { status, repository } = setup();

    await status.record(relay, webhook([{ id: 'wamid.ok', status: 'delivered' }, paymentFailure]));

    expect(repository.recordHoldFailure.calledOnce).to.equal(true);
    const [environmentId, messageId, failure] = repository.recordHoldFailure.firstCall.args;
    expect([environmentId, messageId]).to.deep.equal(['env1', 'wamid.first']);
    expect(failure).to.include({ code: 131042 });
    // Meta's own sentence, with the page that fixes it, so the agent can hand the user the link.
    expect(failure.message).to.equal(
      `Meta didn’t deliver the first message: Message failed to send because your WhatsApp Business account currency is not configured. Visit ${billingPage} to resolve this issue.`
    );
  });

  it('tries what matched nothing once more a second later, as the hold takes Meta’s id just after the send', async () => {
    const { status, repository } = setup();
    const clock = sinon.useFakeTimers();
    repository.recordHoldFailure.callsFake(async (_env: string, id: string) => {
      if (id === 'wamid.broken') {
        throw new Error('db blip');
      }

      // The first message's hold has its id only by the second try.
      return id === 'wamid.first' && repository.recordHoldFailure.callCount > 3 ? { identifier: 'hi_1' } : null;
    });

    try {
      const recording = status.record(
        relay,
        webhook([
          { ...paymentFailure, id: 'wamid.ordinary' },
          { ...paymentFailure, id: 'wamid.broken' },
          paymentFailure,
        ])
      );
      await clock.tickAsync(999);
      expect(repository.recordHoldFailure.callCount).to.equal(3);
      await clock.tickAsync(1);
      await recording;
    } finally {
      clock.restore();
    }

    // Once each, then once more for all three, and never a third time.
    expect(repository.recordHoldFailure.callCount).to.equal(6);
  });

  it('doesn’t wait when every failure found its hold', async () => {
    const { status, repository } = setup();
    const clock = sinon.useFakeTimers();

    try {
      await status.record(relay, webhook([paymentFailure]));
    } finally {
      clock.restore();
    }

    expect(repository.recordHoldFailure.calledOnce).to.equal(true);
  });

  it('reads a body that arrives as text', async () => {
    const { status, repository } = setup();

    await status.record(relay, JSON.stringify(webhook([paymentFailure])));

    expect(repository.recordHoldFailure.calledOnce).to.equal(true);
  });

  it('ignores other platforms, other agents and bodies without failures', async () => {
    const { status, repository } = setup();

    await status.record({ ...relay, platform: 'telegram' }, webhook([paymentFailure]));
    await status.record({ ...relay, isHumanRelay: false }, webhook([paymentFailure]));
    await status.record(relay, webhook([{ id: 'wamid.ok', status: 'read' }]));
    await status.record(relay, 'not json');

    expect(repository.recordHoldFailure.called).to.equal(false);
  });

  it('adds Meta’s link when its sentence doesn’t carry it, and says what 131042 means without one', () => {
    expect(
      describeFailure({
        status: 'failed',
        errors: [{ code: 131042, href: 'https://business.facebook.com/billing_hub' }],
      }).message
    ).to.equal(
      'Meta didn’t deliver the first message: your WhatsApp Business account has no payment method or currency set up. Fix it here: https://business.facebook.com/billing_hub'
    );
  });

  it('keeps Meta’s details for other failures', () => {
    expect(
      describeFailure({
        status: 'failed',
        errors: [{ code: 131026, error_data: { details: 'Message undeliverable' } }],
      })
    ).to.include({ code: 131026, message: 'Meta didn’t deliver the first message: Message undeliverable.' });
  });
});
