export interface INotificationGroups {
  get();
  getOne(id: string);
  create(name: string);
  update(id: string, data: INotificationGroupUpdatePayload);
  delete(id: string);
}

export interface INotificationGroupUpdatePayload {
  name: string;
}
