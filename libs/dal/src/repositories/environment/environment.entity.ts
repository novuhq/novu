export interface IApiKey {
  key: string;
  _userId: string;
}

export class EnvironmentEntity {
  _id?: string;

  name: string;

  _organizationId: string;

  identifier: string;

  apiKeys: IApiKey[];

  encrypted: boolean;

  _parentId: string;
}
