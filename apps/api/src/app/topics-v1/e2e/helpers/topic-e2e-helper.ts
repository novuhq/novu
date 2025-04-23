import { expect } from 'chai';
import { UserSession } from '@novu/testing';

import { TopicsControllerAssignResponse } from '@novu/api/models/operations';
import { GetTopicResponseDto } from '@novu/api/models/components';
import { TopicId, TopicKey, TopicName } from '../../types';
import { initNovuClassSdk } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

export const addSubscribers = async (
  session: UserSession,
  topicKey: TopicKey,
  subscribers: string[]
): Promise<TopicsControllerAssignResponse> => {
  const novuClient = initNovuClassSdk(session);
  const res = await novuClient.topics.subscribers.assign({ subscribers }, topicKey);

  expect(res.result).to.eql({
    succeeded: subscribers,
  });

  return res;
};

export const createTopic = async (
  session: UserSession,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<{ _id: TopicId; key: TopicKey }> => {
  const novuClient = initNovuClassSdk(session);
  const topicsControllerCreateTopicResponse = await novuClient.topics.create({
    key: topicKey,
    name: topicName,
  });
  const { id, key } = topicsControllerCreateTopicResponse.result;
  expect(id).to.exist;
  if (!id) {
    throw new Error('Failed to create topic');
  }
  expect(id).to.be.string;
  expect(key).to.eq(topicKey);

  return { _id: id, key };
};

export const getTopic = async (
  session: UserSession,
  _id: TopicId,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<GetTopicResponseDto> => {
  const novuClient = initNovuClassSdk(session);
  const getResponse = await novuClient.topics.retrieve(topicKey);

  const topic = getResponse.result;

  expect(topic.id).to.eql(_id);
  expect(topic.environmentId).to.eql(session.environment._id);
  expect(topic.organizationId).to.eql(session.organization._id);
  expect(topic.key).to.eql(topicKey);
  expect(topic.name).to.eql(topicName);
  expect(topic.subscribers).to.eql([]);

  return topic;
};
