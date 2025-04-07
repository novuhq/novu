import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { GeneratePreviewRequestDto } from '@novu/shared';

export class PreviewCommand extends EnvironmentWithUserObjectCommand {
  workflowIdOrInternalId: string;
  stepIdOrInternalId: string;
  generatePreviewRequestDto: GeneratePreviewRequestDto;
}
