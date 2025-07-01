import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChannelTypeEnum } from '@novu/shared';

import { LayoutPreviewPayloadDto } from './layout-preview-payload.dto';

export class EmailLayoutRenderOutput {
  @ApiProperty({ description: 'Content of the email' })
  @IsString()
  body: string;
}

@ApiExtraModels(EmailLayoutRenderOutput)
export class GenerateLayoutPreviewResponseDto {
  @ApiProperty({
    description: 'Preview payload example',
    type: () => LayoutPreviewPayloadDto,
  })
  @ValidateNested()
  @Type(() => LayoutPreviewPayloadDto)
  previewPayloadExample: LayoutPreviewPayloadDto;

  @ApiPropertyOptional({
    description: 'The payload schema that was used to generate the preview payload example',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  schema?: any | null;

  @ApiProperty({
    description: 'Preview result',
    type: 'object',
    oneOf: [
      {
        properties: {
          type: { enum: [ChannelTypeEnum.EMAIL] },
          preview: { $ref: getSchemaPath(EmailLayoutRenderOutput) },
        },
      },
    ],
  })
  result: {
    type: ChannelTypeEnum.EMAIL;
    preview?: EmailLayoutRenderOutput;
  };
}
