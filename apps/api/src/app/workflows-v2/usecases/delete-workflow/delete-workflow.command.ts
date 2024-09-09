import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsDefined, IsString } from 'class-validator';

export type RequiredProp<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export class DeleteWorkflowCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  workflowId: string;
}
