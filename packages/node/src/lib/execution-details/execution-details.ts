import { IExecutionDetails } from './execution-details.interface';
import { WithHttp } from '../novu.interface';

export class ExecutionDetails extends WithHttp implements IExecutionDetails {
  async get() {
    return await this.http.get(`/execution-details`);
  }
}
