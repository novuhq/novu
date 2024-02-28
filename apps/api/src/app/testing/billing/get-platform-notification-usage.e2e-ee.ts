import * as sinon from 'sinon';
import { expect } from 'chai';
import { NotificationRepository, OrganizationRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { ApiServiceLevelEnum } from '@novu/shared';

describe('GetPlatformNotificationUsage', () => {
  const eeBilling = require('@novu/ee-billing');
  if (!eeBilling) {
    throw new Error('ee-billing does not exist');
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { GetPlatformNotificationUsage, GetPlatformNotificationUsageCommand } = eeBilling;

  const organizationRepo = new OrganizationRepository();
  const notificationRepo = new NotificationRepository();

  const createUseCase = () => {
    const useCase = new GetPlatformNotificationUsage(organizationRepo);

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

    const orgPromises = new Array(orgCount).fill(null).map(async (_, index) => {
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

      return Promise.resolve({ id: orgSession.organization._id, notificationsCount });
    });
    const organizations = await Promise.all(orgPromises);

    const expectedResult = organizations.map((org) => ({
      _id: org.id.toString(),
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      notificationsCount: org.notificationsCount,
    }));

    const result = await useCase.execute(
      GetPlatformNotificationUsageCommand.create({
        startDate: mockStartDate,
        endDate: mockEndDate,
      })
    );

    expect(result).to.include.deep.members(expectedResult.splice(0, 1));
  });
});
