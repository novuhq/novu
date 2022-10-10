import Axios from 'axios';
import { IChanges } from './changes.interface';
import { WithHttp } from '../novu.interface';

export class Changes extends WithHttp implements IChanges {
  applyAll() {
    throw new Error('Method not implemented.');
  }

  /**
   * @returns {promise<object>} - Returns an object containing all changes
   */
  async get() {
    return await this.http.get(`/changes`);
  }

  /**
   * @returns {promise<object>} - Returns the number of changes
   */
  async getCount() {
    return await this.http.get(`/changes/count`);
  }

  /**
   * @param {string} changeId - The ID of the change that will be applied
   * @returns {promise<object>} - Applies the change specified by the ID
   */
  async applyOne(changeId: string) {
    return await this.http.post(`/changes/${changeId}/apply`, {});
  }

  /**
   * @param {string[]} changeIds - An Array of changes that will be applied
   * @returns {promise<object>} - Applies all changes specified in the array
   */
  async applyMany(changeIds: string[]) {
    return await this.http.post(`/changes/bulk/apply`, {
      ChangeIDs: changeIds,
    });
  }
}
