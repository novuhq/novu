import { NestFactory } from '@nestjs/core';
import { buildDefaultSubscriptionIdentifier } from '@novu/application-generic';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { run as addDefaultIdentifierToTopicSubscribersMigration } from './add-default-identifier-to-topic-subscribers-migration';

describe('Add Default Identifier To Topic Subscribers Migration', () => {
  let mockApp: any;
  let mockLogger: any;
  let mockTopicSubscribersRepository: any;
  let mockCursor: any;
  let bulkWriteStub: sinon.SinonStub;
  let loggerInfoStub: sinon.SinonStub;
  let loggerWarnStub: sinon.SinonStub;
  let loggerErrorStub: sinon.SinonStub;
  let appCloseStub: sinon.SinonStub;

  beforeEach(() => {
    mockCursor = {
      [Symbol.asyncIterator]: async function* () {
        // Empty by default, will be overridden in tests
      },
    };

    bulkWriteStub = sinon.stub().resolves({ modifiedCount: 0 });
    loggerInfoStub = sinon.stub();
    loggerWarnStub = sinon.stub();
    loggerErrorStub = sinon.stub();
    appCloseStub = sinon.stub().resolves();

    mockLogger = {
      setContext: sinon.stub(),
      info: loggerInfoStub,
      warn: loggerWarnStub,
      error: loggerErrorStub,
    };

    mockTopicSubscribersRepository = {
      _model: {
        find: sinon.stub().returns({
          batchSize: sinon.stub().returns({
            cursor: sinon.stub().resolves(mockCursor),
          }),
        }),
      },
      bulkWrite: bulkWriteStub,
    };

    mockApp = {
      resolve: sinon.stub().resolves(mockLogger),
      get: sinon.stub().returns(mockTopicSubscribersRepository),
      close: appCloseStub,
    };

    sinon.stub(NestFactory, 'create').resolves(mockApp);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should process topic subscribers without identifiers and add default identifiers', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: 'subscriber-1',
      },
      {
        _id: 'id2',
        _environmentId: 'env1',
        topicKey: 'topic-2',
        externalSubscriberId: 'subscriber-2',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 2 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(bulkWriteStub.calledOnce).to.be.true;
    expect(bulkWriteStub.firstCall.args[0]).to.have.length(2);
    expect(bulkWriteStub.firstCall.args[0][0].updateOne.update.$set.identifier).to.equal(
      buildDefaultSubscriptionIdentifier('topic-1', 'subscriber-1')
    );
    expect(bulkWriteStub.firstCall.args[0][1].updateOne.update.$set.identifier).to.equal(
      buildDefaultSubscriptionIdentifier('topic-2', 'subscriber-2')
    );
    expect(loggerInfoStub.calledWith('start migration - add default identifier to topic subscribers')).to.be.true;
    expect(loggerInfoStub.calledWith(sinon.match(/end migration - processed 2 topic subscribers, updated 2/))).to.be
      .true;
    expect(appCloseStub.calledOnce).to.be.true;
  });

  it('should skip topic subscribers with missing topicKey', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: null,
        externalSubscriberId: 'subscriber-1',
      },
      {
        _id: 'id2',
        _environmentId: 'env1',
        topicKey: 'topic-2',
        externalSubscriberId: 'subscriber-2',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 1 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(loggerWarnStub.calledWith('Skipping topic subscriber id1 - missing topicKey or externalSubscriberId')).to.be
      .true;
    expect(bulkWriteStub.calledOnce).to.be.true;
    expect(bulkWriteStub.firstCall.args[0]).to.have.length(1);
    expect(loggerInfoStub.calledWith(sinon.match(/end migration - processed 2 topic subscribers, updated 1/))).to.be
      .true;
  });

  it('should skip topic subscribers with missing externalSubscriberId', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: null,
      },
      {
        _id: 'id2',
        _environmentId: 'env1',
        topicKey: 'topic-2',
        externalSubscriberId: 'subscriber-2',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 1 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(loggerWarnStub.calledWith('Skipping topic subscriber id1 - missing topicKey or externalSubscriberId')).to.be
      .true;
    expect(bulkWriteStub.calledOnce).to.be.true;
    expect(bulkWriteStub.firstCall.args[0]).to.have.length(1);
  });

  it('should handle bulk write errors gracefully', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: 'subscriber-1',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.onFirstCall().rejects(new Error('Database error'));

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(loggerErrorStub.calledWith('Error in final bulk write: Error: Database error')).to.be.true;
    expect(bulkWriteStub.calledOnce).to.be.true;
  });

  it('should process remaining items after loop completes', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: 'subscriber-1',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 1 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(bulkWriteStub.calledOnce).to.be.true;
    expect(bulkWriteStub.firstCall.args[0]).to.have.length(1);
  });

  it('should handle empty cursor', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {
      // Empty iterator
    };

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(bulkWriteStub.called).to.be.false;
    expect(loggerInfoStub.calledWith(sinon.match(/end migration - processed 0 topic subscribers, updated 0/))).to.be
      .true;
  });

  it('should use modifiedCount from bulkWrite response when available', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: 'subscriber-1',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 1 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(loggerInfoStub.calledWith(sinon.match(/updated 1/))).to.be.true;
  });

  it('should fallback to bulkWriteOps length when modifiedCount is not available', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'topic-1',
        externalSubscriberId: 'subscriber-1',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({});

    await addDefaultIdentifierToTopicSubscribersMigration();

    expect(loggerInfoStub.calledWith(sinon.match(/updated 1/))).to.be.true;
  });

  it('should query for topic subscribers with missing, null, or empty identifiers', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {
      // Empty iterator
    };

    await addDefaultIdentifierToTopicSubscribersMigration();

    const findCall = mockTopicSubscribersRepository._model.find;
    expect(findCall.calledOnce).to.be.true;
    expect(findCall.firstCall.args[0]).to.deep.equal({
      $or: [{ identifier: { $exists: false } }, { identifier: null }, { identifier: '' }],
    });
    expect(findCall.firstCall.returnValue.batchSize.calledWith(1000)).to.be.true;
  });

  it('should generate correct identifier format', async () => {
    const topicSubscribers = [
      {
        _id: 'id1',
        _environmentId: 'env1',
        topicKey: 'test-topic',
        externalSubscriberId: 'test-subscriber',
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const subscriber of topicSubscribers) {
        yield subscriber;
      }
    };

    bulkWriteStub.resolves({ modifiedCount: 1 });

    await addDefaultIdentifierToTopicSubscribersMigration();

    const expectedIdentifier = buildDefaultSubscriptionIdentifier('test-topic', 'test-subscriber');
    expect(bulkWriteStub.firstCall.args[0][0].updateOne.update.$set.identifier).to.equal(expectedIdentifier);
    expect(expectedIdentifier).to.equal('tk_test-topic:si_test-subscriber');
  });
});
