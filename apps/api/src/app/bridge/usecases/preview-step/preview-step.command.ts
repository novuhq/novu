import { EnvironmentWithUserCommand } from '@novu/application-generic';

export class PreviewStepCommand extends EnvironmentWithUserCommand {
  workflowId: string;
  stepId: string;
  inputs: any;
  controls: any;
  data: any;
}
