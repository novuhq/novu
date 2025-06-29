import { IsString, IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { DuplicateLayoutDto } from '../../dtos';

export class DuplicateLayoutCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsDefined()
  layoutIdOrInternalId: string;

  @ValidateNested()
  @Type(() => DuplicateLayoutDto)
  overrides: DuplicateLayoutDto;
}
