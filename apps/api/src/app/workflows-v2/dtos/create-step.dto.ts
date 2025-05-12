import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  InAppControlDto,
  EmailControlDto,
  SmsControlDto,
  PushControlDto,
  ChatControlDto,
  DelayControlDto,
  DigestControlDto,
  CustomControlDto,
} from './controls'; // Assuming controls DTOs are in a subfolder 'controls'

@ApiExtraModels(
  InAppControlDto,
  EmailControlDto,
  SmsControlDto,
  PushControlDto,
  ChatControlDto,
  DelayControlDto,
  DigestControlDto,
  CustomControlDto
)
export class StepUpsertDto {
  @ApiProperty({
    description: 'Name of the step',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Unique identifier of the step',
    type: 'string',
    required: false,
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    description: 'Type of the step',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
  })
  @IsEnum(StepTypeEnum)
  type: StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Control values for the step, structure depends on the step type.',
    nullable: true,
    oneOf: [
      { $ref: getSchemaPath(InAppControlDto) },
      { $ref: getSchemaPath(EmailControlDto) },
      { $ref: getSchemaPath(SmsControlDto) },
      { $ref: getSchemaPath(PushControlDto) },
      { $ref: getSchemaPath(ChatControlDto) },
      { $ref: getSchemaPath(DelayControlDto) },
      { $ref: getSchemaPath(DigestControlDto) },
      { $ref: getSchemaPath(CustomControlDto) },
    ],
  })
  @IsOptional()
  @ValidateNested() // Add validation for nested DTOs
  @Type((opts) => {
    // Use Type decorator for proper transformation based on 'type' property
    const type = opts?.object?.type as StepTypeEnum;
    switch (type) {
      case StepTypeEnum.IN_APP:
        return InAppControlDto;
      case StepTypeEnum.EMAIL:
        return EmailControlDto;
      case StepTypeEnum.SMS:
        return SmsControlDto;
      case StepTypeEnum.PUSH:
        return PushControlDto;
      case StepTypeEnum.CHAT:
        return ChatControlDto;
      case StepTypeEnum.DELAY:
        return DelayControlDto;
      case StepTypeEnum.DIGEST:
        return DigestControlDto;
      case StepTypeEnum.CUSTOM:
        return CustomControlDto;
      default:
        // Fallback or handle unknown type
        return Object; // Or a more specific default/error handling
    }
  })
  controlValues?:
    | InAppControlDto
    | EmailControlDto
    | SmsControlDto
    | PushControlDto
    | ChatControlDto
    | DelayControlDto
    | DigestControlDto
    | CustomControlDto
    | null;
}
