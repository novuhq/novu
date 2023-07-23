import { IChanges } from './changes.interface';
import { Novu } from '../novu';

export class Changes implements IChanges {
  constructor(private readonly novu: Novu) {}

  // TODO: add pagination options and promoted params
  /**
   * @returns {promise<object>} - Returns an object containing all changes
   */
  async get() {
    return await this.novu.get(`/changes`);
  }

  /**
   * @returns {promise<object>} - Returns the number of changes
   */
  async getCount() {
    return await this.novu.get(`/changes/count`);
  }

  /**
   * @param {string} changeId - The ID of the change that will be applied
   * @returns {promise<object>} - Applies the change specified by the ID
   */
  async applyOne(changeId: string) {
    return await this.novu.post(`/changes/${changeId}/apply`, {});
  }

  /**
   * @param {string[]} changeIds - An Array of changes that will be applied
   * @returns {promise<object>} - Applies all changes specified in the array
   */
  async applyMany(changeIds: string[]) {
    return await this.novu.post(`/changes/bulk/apply`, {
      ChangeIDs: changeIds,
    });
  }
}
