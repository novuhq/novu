/* eslint-disable global-require */
import sinon from 'sinon';
import { expect } from 'chai';
import { EnvironmentRepository, NotificationRepository, CommunityOrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { ApiServiceLevelEnum, isClerkEnabled } from '@novu/shared';

describe('GetPlatformNotificationUsage', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }

  const { GetPlatformNotificationUsage, GetPlatformNotificationUsageCommand } = eeBilling;

  const environmentRepo = new EnvironmentRepository();
  const notificationRepo = new NotificationRepository();
  const communityOrganizationRepo = new CommunityOrganizationRepository();

  const createUseCase = () => {
    const useCase = new GetPlatformNotificationUsage(environmentRepo, notificationRepo, communityOrganizationRepo);

    return useCase;
  };
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it(`should return an empty array when there is no recorded usage`, async () => {
    const useCase = createUseCase();

    // Create organizations without notifications
    const orgsWithoutNotificationsPromises = new Array(10).fill(null).map(async () => {
      const orgSession = new UserSession();
      await orgSession.initialize();

      return Promise.resolve(orgSession.organization._id);
    });
    await Promise.all(orgsWithoutNotificationsPromises);

    const result = await useCase.execute(
      GetPlatformNotificationUsageCommand.create({
        startDate: new Date('2021-01-01'),
        endDate: new Date('2021-01-31'),
      })
    );

    expect(result).to.deep.equal([]);
  });

  it(`should return the usage for the given date range`, async () => {
    const useCase = createUseCase();
    const mockStartDate = new Date('2021-01-01');
    const mockNotificationDate = new Date('2021-01-05');
    const mockEndDate = new Date('2021-01-31');
    const notificationCountPerIndex = 10;
    const orgCount = 10;

    const organizations: any[] = [];

    for (let index = 0; index < orgCount; index += 1) {
      const orgSession = new UserSession();
      await orgSession.initialize();

      const notificationsCount = notificationCountPerIndex * (index + 1);
      await notificationRepo.insertMany(
        new Array(notificationsCount).fill({
          _organizationId: orgSession.organization._id,
          _environmentId: orgSession.environment._id,
          createdAt: mockNotificationDate,
        })
      );
      await orgSession.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

      organizations.push({ id: orgSession.organization._id, notificationsCount });
    }

    let expectedResult = organizations.map((org) => ({
      _id: org.id.toString(),
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      notificationsCount: org.notificationsCount,
    }));

    if (isClerkEnabled()) {
      // we have just one organization in Clerk - we don't create new ones on initialize()
      expectedResult = [expectedResult[expectedResult.length - 1]];
    }

    const result = await useCase.execute(
      GetPlatformNotificationUsageCommand.create({
        startDate: mockStartDate,
        endDate: mockEndDate,
      })
    );

    expect(result).to.include.deep.members(expectedResult.splice(0, 1));
  });

  it(`should return the usage for the given single organization`, async () => {
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    const useCase = createUseCase();
    const notificationsCount = 110;
    const mockNotificationDate = new Date('2021-01-05');

    await notificationRepo.insertMany(
      new Array(notificationsCount).fill({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        createdAt: mockNotificationDate,
      })
    );

    const result = await useCase.execute(
      GetPlatformNotificationUsageCommand.create({
        startDate: new Date('2021-01-01'),
        endDate: new Date('2021-01-31'),
        organizationId: session.organization._id,
      })
    );

    expect(result).to.deep.equal([
      {
        _id: session.organization._id.toString(),
        apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
        notificationsCount,
      },
    ]);
  });
});
