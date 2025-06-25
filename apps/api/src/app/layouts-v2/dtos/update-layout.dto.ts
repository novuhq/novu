import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LayoutControlValuesDto } from './layout-controls.dto';

export class UpdateLayoutDto {
  @ApiProperty({ description: 'Name of the layout' })
  @IsString()
  name: string;

  @ApiProperty({ type: LayoutControlValuesDto, description: 'Control values for the layout' })
  @ValidateNested()
  @Type(() => LayoutControlValuesDto)
  controlValues: LayoutControlValuesDto;
}
