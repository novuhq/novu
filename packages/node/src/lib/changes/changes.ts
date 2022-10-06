import { AxiosInstance } from 'axios';
import { IChanges } from './changes.interface';

export class Changes implements IChanges {
  private readonly http: AxiosInstance;

  constructor(http: AxiosInstance) {
    this.http = http;
  }
  applyAll() {
    throw new Error('Method not implemented.');
  }

  /**
   * @returns {promise<object>} - Returns an object containing all changes
   */
  async get() {
    return await this.http.get(`/v1/changes`);
  }

  /**
   * @returns {promise<object>} - Returns the number of changes
   */
  async getCount() {
    return await this.http.get(`/v1/changes/count`);
  }

  /**
   * @param {string} changeId - The ID of the change that will be applied
   * @returns {promise<object>} - Applies the change specified by the ID
   */
  async applyOne(changeId: string) {
    return await this.http.post(`/v1/changes/${changeId}/apply`, {});
  }

  /**
   * @param {string[]} changeIds - An Array of changes that will be applied
   * @returns {promise<object>} - Applies all changes specified in the array
   */
  async applyMany(changeIds: string[]) {
    return await this.http.post(`/v1/changes/bulk/apply`, { changeIds });
  }
}
