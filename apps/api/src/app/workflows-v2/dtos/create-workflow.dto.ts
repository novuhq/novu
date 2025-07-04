import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import {
  BaseStepConfigDto,
  InAppStepUpsertDto,
  EmailStepUpsertDto,
  SmsStepUpsertDto,
  PushStepUpsertDto,
  ChatStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  CustomStepUpsertDto,
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
export class CreateWorkflowDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier for the workflow' })
  @IsString()
  workflowId: string;

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
    description: 'Source of workflow creation',
    enum: WorkflowCreationSourceEnum,
    enumName: 'WorkflowCreationSourceEnum',
    required: false,
    default: WorkflowCreationSourceEnum.EDITOR,
  })
  @IsOptional()
  @IsEnum(WorkflowCreationSourceEnum)
  __source?: WorkflowCreationSourceEnum;

  @ApiPropertyOptional({
    description: 'Workflow preferences',
    type: PreferencesRequestDto,
    required: false,
  })
  @IsOptional()
  @Type(() => PreferencesRequestDto)
  preferences?: PreferencesRequestDto;
}
