import { ExternalSubscriberId, TopicKey, TopicName } from '@novu/shared';

import {
  ITopicPayload,
  ITopicPaginationPayload,
  ITopics,
  ITopicSubscribersPayload,
} from './topic.interface';

import { WithHttp } from '../novu.interface';

const BASE_PATH = '/topics';

export class Topics extends WithHttp implements ITopics {
  async addSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload) {
    return await this.http.post(`${BASE_PATH}/${topicKey}/subscribers`, data);
  }

  async removeSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload) {
    return await this.http.post(
      `${BASE_PATH}/${topicKey}/subscribers/removal`,
      data
    );
  }

  async list(data: ITopicPaginationPayload) {
    return await this.http.get(BASE_PATH, {
      params: {
        page: data.page,
        ...(data?.pageSize && { pageSize: data.pageSize }),
      },
    });
  }

  async delete(topicKey: TopicKey) {
    return await this.http.delete(`${BASE_PATH}/${topicKey}`);
  }

  async get(topicKey: TopicKey) {
    return await this.http.get(`${BASE_PATH}/${topicKey}`);
  }

  async getSubscriber(
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  ) {
    return await this.http.get(
      `${BASE_PATH}/${topicKey}/subscribers/${externalSubscriberId}`
    );
  }

  async rename(topicKey: TopicKey, newName: TopicName) {
    return await this.http.patch(`${BASE_PATH}/${topicKey}`, {
      name: newName,
    });
  }

  async create(data: ITopicPayload) {
    return await this.http.post(BASE_PATH, {
      key: data.key,
      name: data.name,
    });
  }
}
