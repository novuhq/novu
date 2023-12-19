import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { ChangeModule } from '../../change.module';
import { SharedModule } from '../../../shared/shared.module';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';

describe('Create Change', function () {
  let useCase: CreateChange;
  let session: UserSession;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, ChangeModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    useCase = moduleRef.get<CreateChange>(CreateChange);
  });

  it('should create a change', async function () {
    const _id = '6256ade0099f90172d1cc435';

    const result = await useCase.execute(
      CreateChangeCommand.create({
        changeId: _id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        userId: session.user._id,
        item: {
          _id,
        },
      })
    );
    expect(result.enabled).to.be.eq(false);
    expect(result._entityId).to.be.eq(_id);
    expect(result._creatorId).to.be.eq(session.user._id);
    expect(result._environmentId).to.be.eq(session.environment._id);
    expect(result._organizationId).to.be.eq(session.organization._id);
    expect(result.type).to.be.eq(ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE);
  });

  it('should find diff for item', async function () {
    const _id = '6256ade0099f90172d1cc436';

    await useCase.execute(
      CreateChangeCommand.create({
        changeId: _id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        userId: session.user._id,
        item: {
          _id,
        },
      })
    );
    const change = await useCase.execute(
      CreateChangeCommand.create({
        changeId: _id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        userId: session.user._id,
        item: {
          _id,
          name: 'test',
        },
      })
    );

    expect(change.change[1].op).to.eq('add');
    expect(change.change[1].val).to.eq('test');
    expect(change.change[1].path).to.eql(['name']);
  });
});
