import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { DuplicateLayoutDto } from '../../dtos';

export class DuplicateLayoutCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: string;

  @ValidateNested()
  @Type(() => DuplicateLayoutDto)
  overrides: DuplicateLayoutDto;
}
