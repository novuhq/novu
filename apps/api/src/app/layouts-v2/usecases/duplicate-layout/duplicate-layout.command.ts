import { IsString, IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { DuplicateLayoutDto } from '../../dtos';

export class DuplicateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: string;

  @ValidateNested()
  @Type(() => DuplicateLayoutDto)
  overrides: DuplicateLayoutDto;
}
