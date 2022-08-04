import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';
import { UpdateSubscriberPreferenceBodyDto } from '../dtos/user-preference.dto';
import { getSubscriberPreference } from './get-subscriber-preference.e2e';

describe('GET /widget/subscriber-preference', function () {
  let template: NotificationTemplateEntity;
  let session: UserSession;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();

    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should create user preference', async function () {
    const updateData = {
      enabled: false,
    };

    await updateSubscriberPreference(updateData, session.subscriberToken, template._id);

    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data[0];

    expect(data.preference.enabled).to.equal(false);
    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });

  it('should update user preference', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const createData = {
      enabled: true,
    };

    await updateSubscriberPreference(createData, session.subscriberToken, template._id);

    const updateDataEmailFalse = {
      channel: {
        type: ChannelTypeEnum.EMAIL,
        enabled: false,
      },
    };

    await updateSubscriberPreference(updateDataEmailFalse, session.subscriberToken, template._id);

    const response = (await getSubscriberPreference(session.subscriberToken)).data.data[0];

    expect(response.preference.enabled).to.equal(true);
    expect(response.preference.channels.email).to.equal(false);
  });
  it(
    'should not update empty object should throw exception if ' +
      'no channel and not template enable param - user preference',
    async function () {
      await session.triggerEvent(template.triggers[0].identifier, subscriberId);
      await session.triggerEvent(template.triggers[0].identifier, subscriberId);

      await session.awaitRunningJobs(template._id);

      const createData = {
        templateId: template._id,
        enabled: true,
      };

      await updateSubscriberPreference(createData, session.subscriberToken, template._id);

      const updateDataEmailFalse = {
        channel: {},
      } as UpdateSubscriberPreferenceBodyDto;

      let responseMessage = '';
      try {
        await updateSubscriberPreference(updateDataEmailFalse, session.subscriberToken, template._id);
      } catch (e) {
        responseMessage = 'In order to make an update you need to provider channel or enabled';
      }

      expect(responseMessage).to.equal('In order to make an update you need to provider channel or enabled');
    }
  );
});

export async function updateSubscriberPreference(
  data: UpdateSubscriberPreferenceBodyDto,
  subscriberToken: string,
  templateId: string
) {
  return await axios.patch(`http://localhost:${process.env.PORT}/v1/widgets/preference/${templateId}`, data, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
