import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { WorkflowCommonsFields } from '@novu/application-generic';
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
  HttpRequestStepUpsertDto,
  InAppStepUpsertDto,
  PushStepUpsertDto,
  SmsStepUpsertDto,
  ThrottleStepUpsertDto,
  ToolStepUpsertDto,
  WaitStepUpsertDto,
} from './create-step.dto';
import { PreferencesRequestDto } from './preferences.request.dto';

@ApiExtraModels(
  InAppStepUpsertDto,
  EmailStepUpsertDto,
  SmsStepUpsertDto,
  PushStepUpsertDto,
  ChatStepUpsertDto,
  DelayStepUpsertDto,
  WaitStepUpsertDto,
  DigestStepUpsertDto,
  ThrottleStepUpsertDto,
  ToolStepUpsertDto,
  CustomStepUpsertDto,
  HttpRequestStepUpsertDto
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
        { $ref: getSchemaPath(WaitStepUpsertDto) },
        { $ref: getSchemaPath(DigestStepUpsertDto) },
        { $ref: getSchemaPath(ThrottleStepUpsertDto) },
        { $ref: getSchemaPath(ToolStepUpsertDto) },
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
          [StepTypeEnum.WAIT]: getSchemaPath(WaitStepUpsertDto),
          [StepTypeEnum.DIGEST]: getSchemaPath(DigestStepUpsertDto),
          [StepTypeEnum.THROTTLE]: getSchemaPath(ThrottleStepUpsertDto),
          [StepTypeEnum.TOOL]: getSchemaPath(ToolStepUpsertDto),
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
        { name: StepTypeEnum.WAIT, value: WaitStepUpsertDto },
        { name: StepTypeEnum.DIGEST, value: DigestStepUpsertDto },
        { name: StepTypeEnum.THROTTLE, value: ThrottleStepUpsertDto },
        { name: StepTypeEnum.TOOL, value: ToolStepUpsertDto },
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
    | WaitStepUpsertDto
    | DigestStepUpsertDto
    | ThrottleStepUpsertDto
    | ToolStepUpsertDto
    | CustomStepUpsertDto
    | HttpRequestStepUpsertDto
  )[];

  @ApiProperty({
    description: 'Workflow preferences',
    type: () => PreferencesRequestDto,
  })
  @ValidateNested()
  @Type(() => PreferencesRequestDto)
  preferences: PreferencesRequestDto;

  @ApiPropertyOptional({
    description: 'Origin of the workflow. Accepted for backwards compatibility but ignored on update.',
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
  })
  @IsOptional()
  @IsEnum(ResourceOriginEnum)
  origin?: ResourceOriginEnum;

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
