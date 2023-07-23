import { IFeeds } from './feeds.interface';
import { Novu } from '../novu';

export class Feeds implements IFeeds {
  constructor(private readonly novu: Novu) {}

  async create(name: string) {
    return await this.novu.post(`/feeds`, { name });
  }

  // TODO: Add pagination options
  async get() {
    return await this.novu.get(`/feeds`);
  }

  async delete(feedId: string) {
    return await this.novu.delete(`/feeds/${feedId}`);
  }
}
