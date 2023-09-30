import { EnvironmentWithSubscriber } from '../../commands';
import { CreateExecutionDetailsCommand } from '../create-execution-details';

export class BulkCreateExecutionDetailsCommand extends EnvironmentWithSubscriber {
  details: CreateExecutionDetailsCommand[];
}
