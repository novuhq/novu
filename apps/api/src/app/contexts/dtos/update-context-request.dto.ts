import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContextData } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CONTEXT_DATA_MAX_SIZE_BYTES, IsContextDataSizeValid } from '../validators/data-size.validator';

export class UpdateContextRequestDto {
  @ApiPropertyOptional({
    description: `Context data object containing metadata. Maximum size is ${Math.round(CONTEXT_DATA_MAX_SIZE_BYTES / 1024)}KB.`,
    example: { tenantName: 'Updated Corp', region: 'us-west-2', settings: { theme: 'light' } },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  @IsContextDataSizeValid()
  data?: ContextData;
}
