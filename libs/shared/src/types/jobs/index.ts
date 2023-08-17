import { EnvironmentId } from '../environment';
import { OrganizationId } from '../organization';
import { UserId } from '../user';

export type JobId = string;

export interface IJobData {
  _id: JobId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
}
