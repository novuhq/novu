import { Test } from '@nestjs/testing';
import { UserSession } from '@novu/testing';
import { CreateChange } from './create-change.usecase';
import { ChangeModule } from '../change.module';
import { CreateChangeCommand } from './create-change.command';
import { ChangeEntityTypeEnum } from '@novu/dal';
import { SharedModule } from '../../shared/shared.module';
import { expect } from 'chai';

describe('Create Change', function () {
  let useCase: CreateChange;
  let session: UserSession;
  let _id = '6256ade0099f90172d1cc435';

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
    const result = await useCase.execute(
      CreateChangeCommand.create({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        userId: session.user._id,
        item: {
          _id,
        },
      })
    );
    expect(result.enabled).to.be.eq(true);
    expect(result._entityId).to.be.eq(_id);
    expect(result._creatorId).to.be.eq(session.user._id);
    expect(result._environmentId).to.be.eq(session.environment._id);
    expect(result._organizationId).to.be.eq(session.organization._id);
    expect(result.type).to.be.eq(ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE);
  });

  it('should find diff for item', async function () {
    const oldChange = await useCase.execute(
      CreateChangeCommand.create({
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
    expect(change.change[0].op).to.eq('add');
    expect(change.change[0].value).to.eq('test');
    expect(change.change[0].path).to.eql(['name']);
  });
});
