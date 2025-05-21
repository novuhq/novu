import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepTypeEnum, WorkflowOriginEnum } from '@novu/shared';
import { WorkflowCommonsFields } from './workflow-commons.dto';
import { PreferencesRequestDto } from './preferences.request.dto';
import {
  StepUpsertDto,
  InAppStepUpsertDto,
  EmailStepUpsertDto,
  SmsStepUpsertDto,
  PushStepUpsertDto,
  ChatStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  CustomStepUpsertDto,
} from './create-step.dto';

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
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { value: InAppStepUpsertDto, name: StepTypeEnum.IN_APP },
        { value: EmailStepUpsertDto, name: StepTypeEnum.EMAIL },
        { value: SmsStepUpsertDto, name: StepTypeEnum.SMS },
        { value: PushStepUpsertDto, name: StepTypeEnum.PUSH },
        { value: ChatStepUpsertDto, name: StepTypeEnum.CHAT },
        { value: DelayStepUpsertDto, name: StepTypeEnum.DELAY },
        { value: DigestStepUpsertDto, name: StepTypeEnum.DIGEST },
        { value: CustomStepUpsertDto, name: StepTypeEnum.CUSTOM },
      ],
    },
  })
  steps: StepUpsertDto[];

  @ApiProperty({
    description: 'Workflow preferences',
    type: () => PreferencesRequestDto,
  })
  @ValidateNested()
  @Type(() => PreferencesRequestDto)
  preferences: PreferencesRequestDto;

  @ApiProperty({
    description: 'Origin of the workflow',
    enum: [...Object.values(WorkflowOriginEnum)],
    enumName: 'WorkflowOriginEnum',
  })
  @IsEnum(WorkflowOriginEnum)
  origin: WorkflowOriginEnum;
}
