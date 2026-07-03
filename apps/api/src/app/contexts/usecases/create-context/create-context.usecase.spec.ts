import { ConflictException } from '@nestjs/common';
import { ContextRepository } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateContextCommand } from './create-context.command';
import { CreateContext } from './create-context.usecase';

describe('CreateContext', () => {
  let useCase: CreateContext;
  let contextRepositoryMock: sinon.SinonStubbedInstance<ContextRepository>;

  const baseCommand = CreateContextCommand.create({
    environmentId: 'env_id',
    organizationId: 'org_id',
    userId: 'user_id',
    type: 'tenant',
    id: 'org-acme',
    data: { tenantName: 'Acme Corp' },
  });

  const createdContext = {
    _environmentId: 'env_id',
    _organizationId: 'org_id',
    type: 'tenant',
    id: 'org-acme',
    key: 'tenant:org-acme',
    data: { tenantName: 'Acme Corp' },
  };

  beforeEach(() => {
    contextRepositoryMock = sinon.createStubInstance(ContextRepository);
    useCase = new CreateContext(contextRepositoryMock as unknown as ContextRepository);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create a context when it does not exist', async () => {
    contextRepositoryMock.findOne.resolves(null);
    contextRepositoryMock.create.resolves(createdContext);

    const result = await useCase.execute(baseCommand);

    expect(result).to.deep.equal(createdContext);
  });

  it('should throw ConflictException when context already exists', async () => {
    contextRepositoryMock.findOne.resolves(createdContext);

    try {
      await useCase.execute(baseCommand);
      expect.fail('expected ConflictException');
    } catch (error) {
      expect(error).to.be.instanceOf(ConflictException);
      expect((error as ConflictException).message).to.contain("Context with type 'tenant' and id 'org-acme' already exists");
    }
  });

  it('should throw ConflictException on duplicate key race during create', async () => {
    contextRepositoryMock.findOne.resolves(null);
    contextRepositoryMock.create.rejects(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }));

    try {
      await useCase.execute(baseCommand);
      expect.fail('expected ConflictException');
    } catch (error) {
      expect(error).to.be.instanceOf(ConflictException);
      expect((error as ConflictException).message).to.contain("Context with type 'tenant' and id 'org-acme' already exists");
    }
  });

  it('should rethrow non-duplicate errors from create', async () => {
    const unexpectedError = new Error('connection failed');

    contextRepositoryMock.findOne.resolves(null);
    contextRepositoryMock.create.rejects(unexpectedError);

    try {
      await useCase.execute(baseCommand);
      expect.fail('expected connection failed error');
    } catch (error) {
      expect(error).to.equal(unexpectedError);
    }
  });
});
