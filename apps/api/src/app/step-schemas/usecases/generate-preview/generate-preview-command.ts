import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { GeneratePreviewRequestDto } from '@novu/shared-internal';

export class GeneratePreviewCommand extends EnvironmentWithUserObjectCommand {
  stepType: ChannelTypeEnum;
  generatePreviewRequestDto: GeneratePreviewRequestDto;
}
