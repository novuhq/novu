interface IQueryKeys {
  currentUnpromotedChanges: string;
  currentPromotedChanges: string;
  changesCount: string;
  myEnvironments: string;
  currentEnvironment: string;
  getFeeds: string;
  getLayoutsList: string;
  getLayoutById: string;
  activeNotificationsList: string;
  integrationsList: string;
  getTemplateById: (templateId?: string) => string;
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
  activeNotificationsList: 'activeNotificationsList',
  integrationsList: 'integrationsList',
  getTemplateById: (templateId?: string) => `notificationById:${templateId}`,
});
