import { expect } from 'chai';
import { ConversationActivityTypeEnum } from './conversation-activity.entity';
import { foldMessageRevisions, resolveCurrentMessage } from './message-revisions';

describe('message-revisions', () => {
  it('replaces a message with the latest edit and drops a deleted line', () => {
    const message = {
      _id: 'm1',
      type: ConversationActivityTypeEnum.MESSAGE,
      platformMessageId: '200',
      content: '123',
      sequence: 1,
    };
    const firstEdit = {
      _id: 'e1',
      type: ConversationActivityTypeEnum.EDIT,
      platformMessageId: '200',
      content: '456',
      sequence: 2,
    };
    const secondEdit = {
      _id: 'e2',
      type: ConversationActivityTypeEnum.EDIT,
      platformMessageId: '200',
      content: '789',
      sequence: 3,
    };

    expect(foldMessageRevisions([message], [firstEdit, secondEdit])).to.deep.equal([{ ...message, content: '789' }]);

    expect(
      foldMessageRevisions(
        [message],
        [secondEdit, { _id: 'd1', type: ConversationActivityTypeEnum.DELETE, platformMessageId: '200', sequence: 4 }]
      )
    ).to.deep.equal([]);
  });

  it('leaves tool rows untouched and ignores revisions without a message id', () => {
    const tool = {
      _id: 't1',
      type: ConversationActivityTypeEnum.TOOL_RESULT,
      platformMessageId: '200',
      content: 'ok',
    };

    expect(
      foldMessageRevisions(
        [tool],
        [{ _id: 'e1', type: ConversationActivityTypeEnum.EDIT, platformMessageId: '200', content: '456' }]
      )
    ).to.deep.equal([tool]);
  });

  it('resolveCurrentMessage returns null after delete', () => {
    const message = {
      _id: 'm1',
      type: ConversationActivityTypeEnum.MESSAGE,
      platformMessageId: '200',
      content: '123',
    };

    expect(resolveCurrentMessage(message, [])).to.deep.equal(message);
    expect(
      resolveCurrentMessage(message, [
        { _id: 'd1', type: ConversationActivityTypeEnum.DELETE, platformMessageId: '200' },
      ])
    ).to.equal(null);
  });
});
