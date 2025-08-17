import { ApiExtraModels, ApiHideProperty, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { ResourceOriginEnum, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import {
  BaseStepConfigDto,
  ChatStepUpsertDto,
  CustomStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  EmailStepUpsertDto,
  InAppStepUpsertDto,
  PushStepUpsertDto,
  SmsStepUpsertDto,
} from './create-step.dto';
import { PreferencesRequestDto } from './preferences.request.dto';
import { WorkflowCommonsFields } from './workflow-commons.dto';

@ApiExtraModels(
  InAppStepUpsertDto,
  EmailStepUpsertDto,
  SmsStepUpsertDto,
  PushStepUpsertDto,
  ChatStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  CustomStepUpsertDto
)
export class UpdateWorkflowDto extends WorkflowCommonsFields {
  @ApiPropertyOptional({
    description: 'Workflow ID (allowed only for code-first workflows)',
    type: 'string',
  })
  @IsOptional()
  workflowId?: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(InAppStepUpsertDto) },
        { $ref: getSchemaPath(EmailStepUpsertDto) },
        { $ref: getSchemaPath(SmsStepUpsertDto) },
        { $ref: getSchemaPath(PushStepUpsertDto) },
        { $ref: getSchemaPath(ChatStepUpsertDto) },
        { $ref: getSchemaPath(DelayStepUpsertDto) },
        { $ref: getSchemaPath(DigestStepUpsertDto) },
        { $ref: getSchemaPath(CustomStepUpsertDto) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          [StepTypeEnum.IN_APP]: getSchemaPath(InAppStepUpsertDto),
          [StepTypeEnum.EMAIL]: getSchemaPath(EmailStepUpsertDto),
          [StepTypeEnum.SMS]: getSchemaPath(SmsStepUpsertDto),
          [StepTypeEnum.PUSH]: getSchemaPath(PushStepUpsertDto),
          [StepTypeEnum.CHAT]: getSchemaPath(ChatStepUpsertDto),
          [StepTypeEnum.DELAY]: getSchemaPath(DelayStepUpsertDto),
          [StepTypeEnum.DIGEST]: getSchemaPath(DigestStepUpsertDto),
          [StepTypeEnum.CUSTOM]: getSchemaPath(CustomStepUpsertDto),
        },
      },
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseStepConfigDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: StepTypeEnum.IN_APP, value: InAppStepUpsertDto },
        { name: StepTypeEnum.EMAIL, value: EmailStepUpsertDto },
        { name: StepTypeEnum.SMS, value: SmsStepUpsertDto },
        { name: StepTypeEnum.PUSH, value: PushStepUpsertDto },
        { name: StepTypeEnum.CHAT, value: ChatStepUpsertDto },
        { name: StepTypeEnum.DELAY, value: DelayStepUpsertDto },
        { name: StepTypeEnum.DIGEST, value: DigestStepUpsertDto },
        { name: StepTypeEnum.CUSTOM, value: CustomStepUpsertDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  steps: (
    | InAppStepUpsertDto
    | EmailStepUpsertDto
    | SmsStepUpsertDto
    | PushStepUpsertDto
    | ChatStepUpsertDto
    | DelayStepUpsertDto
    | DigestStepUpsertDto
    | CustomStepUpsertDto
  )[];

  @ApiProperty({
    description: 'Workflow preferences',
    type: () => PreferencesRequestDto,
  })
  @ValidateNested()
  @Type(() => PreferencesRequestDto)
  preferences: PreferencesRequestDto;

  @ApiProperty({
    description: 'Origin of the workflow',
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
  })
  @IsEnum(ResourceOriginEnum)
  origin: ResourceOriginEnum;

  @ApiHideProperty()
  /* @ApiPropertyOptional({
    description: 'Severity of the workflow',
    required: false,
    enum: [...Object.values(SeverityLevelEnum)],
    enumName: 'SeverityLevelEnum',
  }) */
  @IsOptional()
  @IsEnum(SeverityLevelEnum)
  severity?: SeverityLevelEnum;
}
