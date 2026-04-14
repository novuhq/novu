import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  ChatControlDto,
  CustomControlDto,
  DelayControlDto,
  DigestControlDto,
  EmailControlDto,
  HttpRequestControlDto,
  InAppControlDto,
  PushControlDto,
  SmsControlDto,
  ThrottleControlDto,
  WorkflowCommonsFields,
} from '@novu/application-generic';
import {
  SeverityLevelEnum,
  SLUG_IDENTIFIER_REGEX,
  StepTypeEnum,
  slugIdentifierFormatMessage,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import {
  BaseStepConfigDto,
  ChatStepUpsertDto,
  CustomStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  EmailStepUpsertDto,
  HttpRequestStepUpsertDto,
  InAppStepUpsertDto,
  PushStepUpsertDto,
  SmsStepUpsertDto,
  ThrottleStepUpsertDto,
} from './create-step.dto';
import { PreferencesRequestDto } from './preferences.request.dto';

export type StepCreateDto =
  | InAppStepUpsertDto
  | EmailStepUpsertDto
  | SmsStepUpsertDto
  | PushStepUpsertDto
  | ChatStepUpsertDto
  | DelayStepUpsertDto
  | DigestStepUpsertDto
  | ThrottleStepUpsertDto
  | CustomStepUpsertDto
  | HttpRequestStepUpsertDto;

@ApiExtraModels(
  InAppStepUpsertDto,
  EmailStepUpsertDto,
  SmsStepUpsertDto,
  PushStepUpsertDto,
  ChatStepUpsertDto,
  DelayStepUpsertDto,
  DigestStepUpsertDto,
  ThrottleStepUpsertDto,
  CustomStepUpsertDto,
  HttpRequestStepUpsertDto,
  InAppControlDto,
  EmailControlDto,
  SmsControlDto,
  PushControlDto,
  ChatControlDto,
  DelayControlDto,
  DigestControlDto,
  ThrottleControlDto,
  CustomControlDto,
  HttpRequestControlDto
)
export class CreateWorkflowDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier for the workflow' })
  @IsString()
  @Matches(SLUG_IDENTIFIER_REGEX, {
    message: slugIdentifierFormatMessage('workflowId'),
  })
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
        { $ref: getSchemaPath(ThrottleStepUpsertDto) },
        { $ref: getSchemaPath(CustomStepUpsertDto) },
        { $ref: getSchemaPath(HttpRequestStepUpsertDto) },
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
          [StepTypeEnum.THROTTLE]: getSchemaPath(ThrottleStepUpsertDto),
          [StepTypeEnum.CUSTOM]: getSchemaPath(CustomStepUpsertDto),
          [StepTypeEnum.HTTP_REQUEST]: getSchemaPath(HttpRequestStepUpsertDto),
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
        { name: StepTypeEnum.THROTTLE, value: ThrottleStepUpsertDto },
        { name: StepTypeEnum.CUSTOM, value: CustomStepUpsertDto },
        { name: StepTypeEnum.HTTP_REQUEST, value: HttpRequestStepUpsertDto },
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
    | ThrottleStepUpsertDto
    | CustomStepUpsertDto
    | HttpRequestStepUpsertDto
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

  @ApiPropertyOptional({
    description: 'Severity of the workflow',
    required: false,
    enum: [...Object.values(SeverityLevelEnum)],
    enumName: 'SeverityLevelEnum',
  })
  @IsOptional()
  @IsEnum(SeverityLevelEnum)
  severity?: SeverityLevelEnum;
}
