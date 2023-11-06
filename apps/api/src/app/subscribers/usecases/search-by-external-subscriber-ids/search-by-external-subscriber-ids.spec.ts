import { Test } from '@nestjs/testing';
import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberEntity } from '@novu/dal';
import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';

import { SearchByExternalSubscriberIds, SearchByExternalSubscriberIdsCommand } from './index';

import { SubscribersModule } from '../../subscribers.module';
import { SharedModule } from '../../../shared/shared.module';

describe('SearchByExternalSubscriberIdsUseCase', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let useCase: SearchByExternalSubscriberIds;
  let firstSubscriber: SubscriberEntity;
  let secondSubscriber: SubscriberEntity;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, SubscribersModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<SearchByExternalSubscriberIds>(SearchByExternalSubscriberIds);
    subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    firstSubscriber = await subscribersService.createSubscriber();
    secondSubscriber = await subscribersService.createSubscriber();
  });

  it('should search and find the subscribers by the external subscriber ids', async () => {
    const externalSubscriberIds = [firstSubscriber.subscriberId, secondSubscriber.subscriberId];
    const command = SearchByExternalSubscriberIdsCommand.create({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      externalSubscriberIds,
    });
    const res = await useCase.execute(command);

    expect(res.length).to.eql(2);
    expect(res[0]._id).to.eql(firstSubscriber._id);
    expect(res[0].subscriberId).to.eql(firstSubscriber.subscriberId);
    expect(res[1]._id).to.eql(secondSubscriber._id);
    expect(res[1].subscriberId).to.eql(secondSubscriber.subscriberId);
  });

  it('should search and find the subscribers existing by the external subscriber ids', async () => {
    const externalSubscriberIds = [secondSubscriber.subscriberId, 'non-existing-external-subscriber-id'];
    const command = SearchByExternalSubscriberIdsCommand.create({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      externalSubscriberIds,
    });
    const res = await useCase.execute(command);

    expect(res.length).to.eql(1);
    expect(res[0]._id).to.eql(secondSubscriber._id);
    expect(res[0].subscriberId).to.eql(secondSubscriber.subscriberId);
  });
});
