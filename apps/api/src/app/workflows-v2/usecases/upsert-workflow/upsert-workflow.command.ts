import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { CreateWorkflowDto } from '../../dto/workflow.dto';

export type RequiredProp<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export class UpsertWorkflowCommand extends EnvironmentWithUserObjectCommand {
  _id?: string;
  workflowDto: RequiredProp<CreateWorkflowDto, 'origin'>;
}
