import { AxiosInstance } from 'axios';
import { ExternalSubscriberId, TopicKey, TopicName } from '@novu/shared';

import {
  ITopicPayload,
  ITopicPaginationPayload,
  ITopics,
  ITopicSubscribersPayload,
} from './topic.interface';

import { WithHttp } from '../novu.interface';

export class Topics extends WithHttp implements ITopics {
  async addSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload) {
    return await this.http.post(`/topics/${topicKey}/subscribers`, {
      ...data,
    });
  }

  async removeSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload) {
    return await this.http.post(`/topics/${topicKey}/subscribers/removal`, {
      ...data,
    });
  }

  async list(data: ITopicPaginationPayload) {
    return await this.http.get(`/topics`, {
      params: {
        page: data.page,
        ...(data?.pageSize && { pageSize: data.pageSize }),
      },
    });
  }

  async get(topicKey: TopicKey) {
    return await this.http.get(`/topics/${topicKey}`);
  }

  async getSubscriber(
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  ) {
    return await this.http.get(
      `/topics/${topicKey}/subscribers/${externalSubscriberId}`
    );
  }

  async rename(topicKey: TopicKey, newName: TopicName) {
    return await this.http.patch(`/topics/${topicKey}`, {
      name: newName,
    });
  }

  async create(data: ITopicPayload) {
    return await this.http.post(`/topics`, {
      key: data.key,
      name: data.name,
    });
  }
}
