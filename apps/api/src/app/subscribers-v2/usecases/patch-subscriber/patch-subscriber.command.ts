import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { PatchSubscriberRequestDto } from '../../dtos/patch-subscriber.dto';

export class PatchSubscriberCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;

  @ValidateNested()
  @Type(() => PatchSubscriberRequestDto)
  patchSubscriberRequestDto: PatchSubscriberRequestDto;
}
