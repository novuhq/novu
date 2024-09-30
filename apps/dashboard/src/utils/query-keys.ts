interface IQueryKeys {
  myEnvironments: string;
  currentEnvironment: string;
  defaultLocale: string;
}

export const QueryKeys: IQueryKeys = Object.freeze({
  myEnvironments: 'myEnvironments',
  currentEnvironment: 'currentEnvironment',
  defaultLocale: 'defaultLocale',
});
