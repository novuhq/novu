interface IQueryKeys {
  currentUnpromotedChanges: string;
  currentPromotedChanges: string;
  changesCount: string;
  myEnvironments: string;
  currentEnvironment: string;
  getFeeds: string;
  getLayoutsList: string;
  getLayoutById: string;
}

export const QueryKeys: IQueryKeys = Object.freeze({
  currentUnpromotedChanges: 'currentUnpromotedChanges',
  currentPromotedChanges: 'currentPromotedChanges',
  changesCount: 'changesCount',
  myEnvironments: 'myEnvironments',
  currentEnvironment: 'currentEnvironment',
  getFeeds: 'getFeeds',
  getLayoutsList: 'getLayoutsList',
  getLayoutById: 'getLayoutById',
});
