import { expect } from 'chai';
import sinon from 'sinon';
import { ListSubscribersCommand } from './list-subscribers.command';
import { ListSubscribersUseCase } from './list-subscribers.usecase';

describe('ListSubscribersUseCase', () => {
  let useCase: ListSubscribersUseCase;
  let subscriberRepositoryMock: { listSubscribers: sinon.SinonStub };

  const baseCommand = ListSubscribersCommand.create({
    user: {
      _id: 'user_id',
      environmentId: 'env_id',
      organizationId: 'org_id',
    } as ListSubscribersCommand['user'],
    limit: 10,
  });

  beforeEach(() => {
    subscriberRepositoryMock = {
      listSubscribers: sinon.stub(),
    };
    useCase = new ListSubscribersUseCase(subscriberRepositoryMock as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return empty results for an invalid cursor without querying the repository', async () => {
    const command = ListSubscribersCommand.create({
      ...baseCommand,
      after: '1',
    });

    const result = await useCase.execute(command);

    expect(result).to.deep.equal({
      data: [],
      next: null,
      previous: null,
      totalCount: 0,
      totalCountCapped: false,
    });
    expect(subscriberRepositoryMock.listSubscribers.called).to.be.false;
  });
});
