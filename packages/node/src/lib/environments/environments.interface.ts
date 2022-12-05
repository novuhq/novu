export interface IEnvironments {
  getCurrent();
  getAll();
  create(payload: IEnvironmentCreatePayload);
  updateOne(id: string, payload: IEnvironmentUpdatePayload);
  getApiKeys();
  regenerateApiKeys();
  updateWidget(payload: IWidgetUpdatePayload);
}

export interface IEnvironmentCreatePayload {
  name: string;
  parentId?: string;
}

export interface IEnvironmentUpdatePayload {
  name?: string;
  identifier?: string;
  parentId?: string;
}

export interface IWidgetUpdatePayload {
  notificationCenterEncryption: boolean;
}
