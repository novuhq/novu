import { IFeeds } from './feeds.interface';
import { WithHttp } from '../novu.interface';

export class Feeds extends WithHttp implements IFeeds {
  async create(name: string) {
    return await this.postRequest(`/feeds`, { name });
  }

  // TODO: Add pagination options
  async get() {
    return await this.getRequest(`/feeds`);
  }

  async delete(feedId: string) {
    return await this.deleteRequest(`/feeds/${feedId}`);
  }
}
