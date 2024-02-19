import { expect } from 'chai';
import { UserSession } from '@novu/testing';

import { GetTopicResponseDto } from '../../dtos';
import { TopicId, TopicKey, TopicName } from '../../types';

const BASE_PATH = '/v1/topics';

export const addSubscribers = async (
  session: UserSession,
  topicKey: TopicKey,
  subscribers: string[]
): Promise<void> => {
  const topicUrl = `${BASE_PATH}/${topicKey}`;
  const addSubscribersUrl = `${topicUrl}/subscribers`;

  const response = await session.testAgent.post(addSubscribersUrl).send({ subscribers });

  expect(response.statusCode).to.eql(200);
  expect(response.body.data).to.eql({
    succeeded: subscribers,
  });
};

export const createTopic = async (
  session: UserSession,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<{ _id: TopicId; key: TopicKey }> => {
  const response = await session.testAgent.post(BASE_PATH).send({
    key: topicKey,
    name: topicName,
  });

  expect(response.statusCode).to.eql(201);

  const { body } = response;
  const { _id, key } = body.data;
  expect(_id).to.exist;
  expect(_id).to.be.string;
  expect(key).to.eq(topicKey);

  return { _id, key };
};

export const getTopic = async (
  session: UserSession,
  _id: TopicId,
  topicKey: TopicKey,
  topicName: TopicName
): Promise<GetTopicResponseDto> => {
  const url = `${BASE_PATH}/${topicKey}`;
  const getResponse = await session.testAgent.get(url);

  expect(getResponse.statusCode).to.eql(200);

  const topic = getResponse.body.data;

  expect(topic._id).to.eql(_id);
  expect(topic._environmentId).to.eql(session.environment._id);
  expect(topic._organizationId).to.eql(session.organization._id);
  expect(topic.key).to.eql(topicKey);
  expect(topic.name).to.eql(topicName);
  expect(topic.subscribers).to.eql([]);

  return topic;
};
