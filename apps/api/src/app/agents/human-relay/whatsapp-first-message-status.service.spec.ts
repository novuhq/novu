import { expect } from 'chai';
import sinon from 'sinon';
import { describeFailure, WhatsAppFirstMessageStatus } from './whatsapp-first-message-status.service';

describe('WhatsAppFirstMessageStatus', () => {
  const relay = { environmentId: 'env1', platform: 'whatsapp', isHumanRelay: true };
  const webhook = (statuses: unknown[]) => ({ entry: [{ changes: [{ field: 'messages', value: { statuses } }] }] });
  const paymentFailure = {
    id: 'wamid.first',
    status: 'failed',
    errors: [{ code: 131042, title: 'Business eligibility payment issue' }],
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
    expect(failure.message).to.contain('no payment method or currency');
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

  it('keeps Meta’s details for other failures', () => {
    expect(
      describeFailure({
        status: 'failed',
        errors: [{ code: 131026, error_data: { details: 'Message undeliverable' } }],
      })
    ).to.include({ code: 131026, message: 'Meta didn’t deliver the first message: Message undeliverable.' });
  });
});
