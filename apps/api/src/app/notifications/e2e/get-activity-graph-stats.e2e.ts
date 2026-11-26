import { NotificationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { subDays } from 'date-fns';
import { Types } from 'mongoose';

describe('Get activity graph stats - /notifications/graph/stats (GET) #novu-v2', () => {
  let session: UserSession;
  const notificationRepository = new NotificationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  async function seedNotification(createdAt: Date) {
    await notificationRepository._model.collection.insertOne({
      _environmentId: new Types.ObjectId(session.environment._id),
      _organizationId: new Types.ObjectId(session.organization._id),
      _templateId: new Types.ObjectId(),
      _subscriberId: new Types.ObjectId(),
      transactionId: new Types.ObjectId().toString(),
      channels: [ChannelTypeEnum.IN_APP],
      createdAt,
      updatedAt: createdAt,
    });
  }

  function utcDay(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  it("should cap the requested days at the plan's retention window", async () => {
    const now = new Date();
    const threeDaysAgo = subDays(now, 3);
    await seedNotification(now);
    await seedNotification(threeDaysAgo);

    const { body: freeBody } = await session.testAgent
      .get('/v1/notifications/graph/stats')
      .query({ days: 30 })
      .expect(200);

    expect(freeBody.data.map((day: { _id: string }) => day._id)).to.deep.equal([utcDay(now)]);

    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    const { body: businessBody } = await session.testAgent
      .get('/v1/notifications/graph/stats')
      .query({ days: 30 })
      .expect(200);

    expect(businessBody.data.map((day: { _id: string }) => day._id)).to.have.members([
      utcDay(now),
      utcDay(threeDaysAgo),
    ]);
  });
});
