import { AxiosInstance } from 'axios';
import { WithHttp } from '../novu.interface';
import {
  ITopicPayload,
  ITopicPaginationPayload,
  ITopics,
  ITopicSubscribersPayload,
} from './topic.interface';

export class Topics extends WithHttp implements ITopics {
  async addSubscribers(topicId: string, data: ITopicSubscribersPayload) {
    return await this.http.post(`/topics/${topicId}/subscribers`, {
      ...data,
    });
  }

  async removeSubscribers(topicId: string, data: ITopicSubscribersPayload) {
    return await this.http.post(`/topics/${topicId}/subscribers/removal`, {
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

  async get(topicKey: string) {
    return await this.http.get(`/topics`, {
      params: {
        key: topicKey,
      },
    });
  }

  async rename(topicId: string, newName: string) {
    return await this.http.patch(`/topics/${topicId}`, {
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
