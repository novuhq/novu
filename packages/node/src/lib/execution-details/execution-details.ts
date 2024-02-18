import {
  IExecutionDetails,
  IExecutionDetailsPayload,
} from './execution-details.interface';
import { WithHttp } from '../novu.interface';

export class ExecutionDetails extends WithHttp implements IExecutionDetails {
  async get(data: IExecutionDetailsPayload) {
    const { notificationId, subscriberId } = data;

    return await this.http.get(`/execution-details`, {
      params: { notificationId, subscriberId },
    });
  }
}
