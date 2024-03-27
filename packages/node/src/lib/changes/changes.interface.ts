export interface IChanges {
  get(data: IChangesPayload);
  getCount();
  applyOne(changeId: string);
  applyMany(changeIds: string[]);
}

export interface IChangesPayload {
  page?: number;
  limit?: number;
  promoted: boolean;
}
