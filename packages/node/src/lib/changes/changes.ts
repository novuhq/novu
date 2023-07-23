import { IChanges } from './changes.interface';
import { WithHttp } from '../novu.interface';

export class Changes extends WithHttp implements IChanges {
  // TODO: add pagination options and promoted params
  /**
   * @returns {promise<object>} - Returns an object containing all changes
   */
  async get() {
    return await this.getRequest(`/changes`);
  }

  /**
   * @returns {promise<object>} - Returns the number of changes
   */
  async getCount() {
    return await this.getRequest(`/changes/count`);
  }

  /**
   * @param {string} changeId - The ID of the change that will be applied
   * @returns {promise<object>} - Applies the change specified by the ID
   */
  async applyOne(changeId: string) {
    return await this.postRequest(`/changes/${changeId}/apply`, {});
  }

  /**
   * @param {string[]} changeIds - An Array of changes that will be applied
   * @returns {promise<object>} - Applies all changes specified in the array
   */
  async applyMany(changeIds: string[]) {
    return await this.postRequest(`/changes/bulk/apply`, {
      ChangeIDs: changeIds,
    });
  }
}
