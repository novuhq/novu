import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { PatchSubscriberRequestDto } from '../../dtos/patch-subscriber.dto';

export class PatchSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ValidateNested()
  @Type(() => PatchSubscriberRequestDto)
  patchSubscriberRequestDto: PatchSubscriberRequestDto;
}
