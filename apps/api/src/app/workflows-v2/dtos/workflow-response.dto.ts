import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateWorkflowDto,
  Slug,
  StepTypeEnum,
  UpdateWorkflowDto,
  ResourceOriginEnum,
  WorkflowStatusEnum,
} from '@novu/shared';
import { WorkflowCommonsFields } from './workflow-commons.dto';
import { StepResponseDto } from './step.response.dto';
import { WorkflowPreferencesResponseDto } from './preferences.response.dto';
import { RuntimeIssueDto } from './runtime-issue.dto';
import { EmailStepResponseDto } from './step-responses/email-step.response.dto';
import { SmsStepResponseDto } from './step-responses/sms-step.response.dto';
import { PushStepResponseDto } from './step-responses/push-step.response.dto';
import { ChatStepResponseDto } from './step-responses/chat-step.response.dto';
import { DelayStepResponseDto } from './step-responses/delay-step.response.dto';
import { DigestStepResponseDto } from './step-responses/digest-step.response.dto';
import { CustomStepResponseDto } from './step-responses/custom-step.response.dto';
import { InAppStepResponseDto } from './step-responses/in-app-step.response.dto';

@ApiExtraModels(
  RuntimeIssueDto,
  StepResponseDto,
  EmailStepResponseDto,
  SmsStepResponseDto,
  PushStepResponseDto,
  ChatStepResponseDto,
  DelayStepResponseDto,
  DigestStepResponseDto,
  CustomStepResponseDto,
  InAppStepResponseDto
)
export class WorkflowResponseDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier of the workflow' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Slug of the workflow' })
  @IsString()
  slug: Slug;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: 'array',
    items: {
      oneOf: [
        { $ref: getSchemaPath(InAppStepResponseDto) },
        { $ref: getSchemaPath(EmailStepResponseDto) },
        { $ref: getSchemaPath(SmsStepResponseDto) },
        { $ref: getSchemaPath(PushStepResponseDto) },
        { $ref: getSchemaPath(ChatStepResponseDto) },
        { $ref: getSchemaPath(DelayStepResponseDto) },
        { $ref: getSchemaPath(DigestStepResponseDto) },
        { $ref: getSchemaPath(CustomStepResponseDto) },
      ],
      discriminator: {
        propertyName: 'type',
        mapping: {
          [StepTypeEnum.IN_APP]: getSchemaPath(InAppStepResponseDto),
          [StepTypeEnum.EMAIL]: getSchemaPath(EmailStepResponseDto),
          [StepTypeEnum.SMS]: getSchemaPath(SmsStepResponseDto),
          [StepTypeEnum.PUSH]: getSchemaPath(PushStepResponseDto),
          [StepTypeEnum.CHAT]: getSchemaPath(ChatStepResponseDto),
          [StepTypeEnum.DELAY]: getSchemaPath(DelayStepResponseDto),
          [StepTypeEnum.DIGEST]: getSchemaPath(DigestStepResponseDto),
          [StepTypeEnum.CUSTOM]: getSchemaPath(CustomStepResponseDto),
        },
      },
    },
  })
  @ValidateNested({ each: true })
  @Type(() => StepResponseDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: StepTypeEnum.IN_APP, value: InAppStepResponseDto },
        { name: StepTypeEnum.EMAIL, value: EmailStepResponseDto },
        { name: StepTypeEnum.SMS, value: SmsStepResponseDto },
        { name: StepTypeEnum.PUSH, value: PushStepResponseDto },
        { name: StepTypeEnum.CHAT, value: ChatStepResponseDto },
        { name: StepTypeEnum.DELAY, value: DelayStepResponseDto },
        { name: StepTypeEnum.DIGEST, value: DigestStepResponseDto },
        { name: StepTypeEnum.CUSTOM, value: CustomStepResponseDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  steps: StepResponseDto[];

  @ApiProperty({
    description: 'Origin of the workflow',
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
  })
  @IsEnum(ResourceOriginEnum)
  origin: ResourceOriginEnum;

  @ApiProperty({
    description: 'Preferences for the workflow',
    type: () => WorkflowPreferencesResponseDto,
  })
  @ValidateNested()
  @Type(() => WorkflowPreferencesResponseDto)
  preferences: WorkflowPreferencesResponseDto;

  @ApiProperty({
    description: 'Status of the workflow',
    enum: [...Object.values(WorkflowStatusEnum)],
    enumName: 'WorkflowStatusEnum',
  })
  @IsEnum(WorkflowStatusEnum)
  status: WorkflowStatusEnum;

  @ApiPropertyOptional({
    description: 'Runtime issues for workflow creation and update',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(RuntimeIssueDto),
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuntimeIssueDto)
  issues?: Record<WorkflowCreateAndUpdateKeys, RuntimeIssueDto>;

  @ApiPropertyOptional({
    description: 'Timestamp of the last workflow trigger',
    type: 'string',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastTriggeredAt?: string;

  @ApiPropertyOptional({
    description: 'Generated payload example based on the payload schema',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsOptional()
  payloadExample?: object;
}

export type WorkflowCreateAndUpdateKeys = keyof CreateWorkflowDto | keyof UpdateWorkflowDto;
