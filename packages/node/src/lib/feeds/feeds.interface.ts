export interface IFeeds {
  get();
  create(name: string);
  delete(feedId: string);
}
