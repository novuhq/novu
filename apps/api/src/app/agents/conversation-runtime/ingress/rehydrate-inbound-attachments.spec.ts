import { expect } from 'chai';
import type { Adapter, Attachment, Message } from 'chat';
import sinon from 'sinon';
import { rehydrateInboundAttachments } from './rehydrate-inbound-attachments';

function makeMessage(attachments?: Attachment[]): Message {
  return { attachments } as Message;
}

describe('rehydrateInboundAttachments', () => {
  it('restores fetchData through the adapter when attachments lost it on serialize', () => {
    const restored: Attachment = {
      type: 'image',
      name: 'image.png',
      mimeType: 'image/png',
      size: 10,
      url: 'https://files.slack.com/files-pri/T1/F1/image.png',
      fetchData: async () => Buffer.from('png'),
    };
    const rehydrateAttachment = sinon.stub().returns(restored);
    const adapter = { rehydrateAttachment } as unknown as Adapter;
    const message = makeMessage([
      {
        type: 'image',
        name: 'image.png',
        mimeType: 'image/png',
        size: 10,
        url: 'https://files.slack.com/files-pri/T1/F1/image.png',
      },
    ]);

    rehydrateInboundAttachments(adapter, message);

    expect(rehydrateAttachment.calledOnce).to.equal(true);
    expect(message.attachments).to.deep.equal([restored]);
    expect(typeof message.attachments?.[0]?.fetchData).to.equal('function');
  });

  it('leaves attachments unchanged when the adapter has no rehydrateAttachment', () => {
    const original: Attachment = {
      type: 'image',
      name: 'image.png',
      mimeType: 'image/png',
      url: 'https://files.slack.com/file.png',
    };
    const message = makeMessage([original]);

    rehydrateInboundAttachments({} as Adapter, message);

    expect(message.attachments).to.deep.equal([original]);
  });

  it('is a no-op when there are no attachments', () => {
    const rehydrateAttachment = sinon.stub();
    const message = makeMessage();

    rehydrateInboundAttachments({ rehydrateAttachment } as unknown as Adapter, message);

    expect(rehydrateAttachment.called).to.equal(false);
  });
});
