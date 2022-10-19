export interface IChanges {
  get();
  getCount();
  applyOne(changeId: string);
  applyMany(changeIds: string[]);
}
