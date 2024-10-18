import { ChannelTypeEnum, GeneratePreviewRequestDto } from '@novu/shared';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';

export class GeneratePreviewCommand extends EnvironmentWithUserObjectCommand {
  stepType: ChannelTypeEnum;
  generatePreviewRequestDto: GeneratePreviewRequestDto;
}
