import { IsArray, IsString } from 'class-validator';
import { BuilderFieldType, BuilderGroupValues, FilterParts } from '@novu/shared';

export class MessageFilter {
  isNegated?: boolean;

  @IsString()
  type?: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: FilterParts[];
}
