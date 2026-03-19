import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { HttpRequestControlDto } from '../controls/http-request-control.dto';
import { StepResponseDto } from '../step.response.dto';

class HttpRequestControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to HTTP Request step',
    type: () => HttpRequestControlDto,
  })
  @ValidateNested()
  @Type(() => HttpRequestControlDto)
  declare values: HttpRequestControlDto;
}

export class HttpRequestStepResponseDto extends StepResponseDto<HttpRequestControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the HTTP request step',
    type: () => HttpRequestControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => HttpRequestControlsMetadataResponseDto)
  declare controls: HttpRequestControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the HTTP request step',
    type: () => HttpRequestControlDto,
  })
  @ValidateNested()
  @Type(() => HttpRequestControlDto)
  declare controlValues?: HttpRequestControlDto;
}
