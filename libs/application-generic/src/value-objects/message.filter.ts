import { BuilderFieldType, BuilderGroupValues, FilterParts } from '@novu/shared';
import { IsArray, IsString } from 'class-validator';

export class MessageFilter {
  isNegated?: boolean;

  @IsString()
  type?: BuilderFieldType;

  @IsString()
  value: BuilderGroupValues;

  @IsArray()
  children: FilterParts[];
}
