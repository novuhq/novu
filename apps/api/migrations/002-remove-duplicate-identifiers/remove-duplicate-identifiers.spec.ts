import { NestFactory } from '@nestjs/core';
import { expect } from 'chai';
import { afterEach, beforeEach, describe, it } from 'mocha';
import * as sinon from 'sinon';
import { run as removeDuplicateIdentifiersMigration } from './remove-duplicate-identifiers';

describe('Remove Duplicate Identifiers Migration', () => {
  let mockApp: any;
  let mockLogger: any;
  let mockTopicSubscribersRepository: any;
  let mockCursor: any;
  let bulkWriteStub: sinon.SinonStub;
  let loggerInfoStub: sinon.SinonStub;
  let loggerErrorStub: sinon.SinonStub;
  let appCloseStub: sinon.SinonStub;

  beforeEach(() => {
    mockCursor = {
      [Symbol.asyncIterator]: async function* () {},
    };

    bulkWriteStub = sinon.stub().resolves({ deletedCount: 0 });
    loggerInfoStub = sinon.stub();
    loggerErrorStub = sinon.stub();
    appCloseStub = sinon.stub().resolves();

    mockLogger = {
      setContext: sinon.stub(),
      info: loggerInfoStub,
      error: loggerErrorStub,
    };

    mockTopicSubscribersRepository = {
      _model: {
        aggregate: sinon.stub().returns({
          cursor: sinon.stub().returns(mockCursor),
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

  it('should keep oldest document and delete newer duplicates', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: 'env1',
          identifier: 'tk_topic-1:si_subscriber-1',
        },
        count: 3,
        documentIds: ['oldest-doc', 'middle-doc', 'newest-doc'],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 2 });

    await removeDuplicateIdentifiersMigration();

    expect(bulkWriteStub.calledOnce).to.be.true;
    const deleteOps = bulkWriteStub.firstCall.args[0];
    expect(deleteOps).to.have.length(2);
    expect(deleteOps[0].deleteOne.filter._id).to.equal('middle-doc');
    expect(deleteOps[1].deleteOne.filter._id).to.equal('newest-doc');
  });

  it('should log kept and deleted document IDs for each duplicate group', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: 'env1',
          identifier: 'tk_topic-1:si_subscriber-1',
        },
        count: 3,
        documentIds: ['doc1', 'doc2', 'doc3'],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 2 });

    await removeDuplicateIdentifiersMigration();

    expect(
      loggerInfoStub.calledWith(
        sinon.match({
          message: 'Processing duplicate group',
          environmentId: 'env1',
          identifier: 'tk_topic-1:si_subscriber-1',
          keptDocumentId: 'doc1',
          deletingDocumentIds: ['doc2', 'doc3'],
        })
      )
    ).to.be.true;
  });

  it('should process multiple duplicate groups and delete from each', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: 'env1',
          identifier: 'identifier-1',
        },
        count: 2,
        documentIds: ['doc1', 'doc2'],
      },
      {
        _id: {
          _environmentId: 'env2',
          identifier: 'identifier-2',
        },
        count: 3,
        documentIds: ['doc3', 'doc4', 'doc5'],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 3 });

    await removeDuplicateIdentifiersMigration();

    expect(bulkWriteStub.calledOnce).to.be.true;
    const deleteOps = bulkWriteStub.firstCall.args[0];
    expect(deleteOps).to.have.length(3);
  });

  it('should handle empty cursor when no duplicates exist', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {};

    await removeDuplicateIdentifiersMigration();

    expect(loggerInfoStub.calledWith('start migration - remove duplicate identifiers in topic subscribers')).to.be.true;
    expect(loggerInfoStub.calledWith(sinon.match(/processed 0 duplicate groups, deleted 0 documents/))).to.be.true;
    expect(bulkWriteStub.called).to.be.false;
    expect(appCloseStub.calledOnce).to.be.true;
  });

  it('should handle migration errors gracefully', async () => {
    const error = new Error('Migration failed');
    mockCursor[Symbol.asyncIterator] = async function* () {
      throw error;
    };

    await removeDuplicateIdentifiersMigration();

    expect(loggerErrorStub.calledWith('Error during migration: Error: Migration failed')).to.be.true;
    expect(appCloseStub.calledOnce).to.be.true;
  });

  it('should handle bulk delete errors gracefully', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: 'env1',
          identifier: 'identifier-1',
        },
        count: 2,
        documentIds: ['doc1', 'doc2'],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.rejects(new Error('Bulk delete failed'));

    await removeDuplicateIdentifiersMigration();

    expect(loggerErrorStub.calledWith('Error in final bulk delete: Error: Bulk delete failed')).to.be.true;
    expect(appCloseStub.calledOnce).to.be.true;
  });

  it('should use correct aggregation pipeline with sort before group', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {};

    await removeDuplicateIdentifiersMigration();

    const aggregateCall = mockTopicSubscribersRepository._model.aggregate;
    expect(aggregateCall.calledOnce).to.be.true;

    const pipeline = aggregateCall.firstCall.args[0];
    expect(pipeline).to.have.length(4);

    expect(pipeline[0].$match).to.deep.equal({
      identifier: { $exists: true },
    });

    expect(pipeline[1].$sort).to.deep.equal({ _id: 1 });

    expect(pipeline[2].$group).to.deep.equal({
      _id: {
        _environmentId: '$_environmentId',
        identifier: '$identifier',
      },
      count: { $sum: 1 },
      documentIds: { $push: '$_id' },
    });

    expect(pipeline[3].$match).to.deep.equal({
      count: { $gt: 1 },
    });
  });

  it('should use cursor with batch size of 500 for memory efficiency', async () => {
    mockCursor[Symbol.asyncIterator] = async function* () {};

    await removeDuplicateIdentifiersMigration();

    const cursorCall = mockTopicSubscribersRepository._model.aggregate().cursor;
    expect(cursorCall.calledWith({ batchSize: 500 })).to.be.true;
  });

  it('should batch delete operations when exceeding batch size', async () => {
    const manyDuplicates = Array.from({ length: 300 }, (_, i) => ({
      _id: {
        _environmentId: 'env1',
        identifier: `identifier-${i}`,
      },
      count: 3,
      documentIds: [`doc-${i}-1`, `doc-${i}-2`, `doc-${i}-3`],
    }));

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of manyDuplicates) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 500 });

    await removeDuplicateIdentifiersMigration();

    expect(bulkWriteStub.calledTwice).to.be.true;
  });

  it('should log document IDs as strings when ObjectIds are returned', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: { toString: () => 'env-obj-id' },
          identifier: 'test-identifier',
        },
        count: 2,
        documentIds: [{ toString: () => 'kept-id' }, { toString: () => 'deleted-id' }],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 1 });

    await removeDuplicateIdentifiersMigration();

    expect(
      loggerInfoStub.calledWith(
        sinon.match({
          message: 'Processing duplicate group',
          environmentId: 'env-obj-id',
          keptDocumentId: 'kept-id',
          deletingDocumentIds: ['deleted-id'],
        })
      )
    ).to.be.true;
  });

  it('should report correct total deleted count in final log', async () => {
    const duplicateGroups = [
      {
        _id: {
          _environmentId: 'env1',
          identifier: 'identifier-1',
        },
        count: 3,
        documentIds: ['doc1', 'doc2', 'doc3'],
      },
    ];

    mockCursor[Symbol.asyncIterator] = async function* () {
      for (const group of duplicateGroups) {
        yield group;
      }
    };

    bulkWriteStub.resolves({ deletedCount: 2 });

    await removeDuplicateIdentifiersMigration();

    expect(loggerInfoStub.calledWith(sinon.match(/processed 1 duplicate groups, deleted 2 documents/))).to.be.true;
  });
});
