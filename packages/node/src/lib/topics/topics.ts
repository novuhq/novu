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
  async create(data: ITopicPayload) {
    return await this.http.post(BASE_PATH, {
      key: data.key,
      name: data.name,
    });
  }

  async addSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload) {
    return await this.http.post(`${BASE_PATH}/${topicKey}/subscribers`, data);
  }

  /**
   * deprecated use checkSubscriber instead
   */
  async getSubscriber(
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  ) {
    return await this.http.get(
      `${BASE_PATH}/${topicKey}/subscribers/${externalSubscriberId}`
    );
  }

  async checkSubscriber(
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  ) {
    return await this.http.get(
      `${BASE_PATH}/${topicKey}/subscribers/${externalSubscriberId}`
    );
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
        // handle page = 0 by toString()
        ...(data?.page?.toString() && { page: data.page }),
        ...(data?.pageSize && { pageSize: data.pageSize }),
        ...(data?.key && { key: data.key }),
      },
    });
  }

  async delete(topicKey: TopicKey) {
    return await this.http.delete(`${BASE_PATH}/${topicKey}`);
  }

  async get(topicKey: TopicKey) {
    return await this.http.get(`${BASE_PATH}/${topicKey}`);
  }

  async rename(topicKey: TopicKey, newName: TopicName) {
    return await this.http.patch(`${BASE_PATH}/${topicKey}`, {
      name: newName,
    });
  }
}
