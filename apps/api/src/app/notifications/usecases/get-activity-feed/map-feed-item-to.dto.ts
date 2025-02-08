import {
  ExecutionDetailFeedItem,
  JobFeedItem,
  NotificationFeedItemEntity,
  NotificationStepEntity,
  StepFilter,
  SubscriberFeedItem,
  TemplateFeedItem,
} from '@novu/dal';
import {
  DigestTypeEnum,
  FilterParts,
  FilterPartTypeEnum,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
  ProvidersIdEnum,
  StepTypeEnum,
} from '@novu/shared';
import { MessageTemplateDto } from '../../../shared/dtos/message.template.dto';
import {
  FieldFilterPartDto,
  FilterPartsDto,
  OnlineInLastFilterPartDto,
  PreviousStepFilterPartDto,
  RealtimeOnlineFilterPartDto,
  StepFilterDto,
  TenantFilterPartDto,
  WebhookFilterPartDto,
} from '../../../shared/dtos/step-filter-dto';
import {
  ActivityNotificationExecutionDetailResponseDto,
  ActivityNotificationJobResponseDto,
  ActivityNotificationResponseDto,
  ActivityNotificationStepResponseDto,
  ActivityNotificationSubscriberResponseDto,
  ActivityNotificationTemplateResponseDto,
  DigestMetadataDto,
} from '../../dtos/activities-response.dto';

function buildSubscriberDto(subscriber: SubscriberFeedItem): ActivityNotificationSubscriberResponseDto {
  return {
    _id: subscriber._id,
    subscriberId: subscriber.subscriberId,
    email: subscriber.email,
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    phone: subscriber.phone,
  };
}

function buildTemplate(template: TemplateFeedItem): ActivityNotificationTemplateResponseDto {
  return {
    _id: template._id,
    name: template.name,
    triggers: template.triggers,
  };
}

export function mapFeedItemToDto(entity: NotificationFeedItemEntity): ActivityNotificationResponseDto {
  return {
    _digestedNotificationId: entity._digestedNotificationId,
    _environmentId: entity._environmentId,
    _id: entity._id,
    _organizationId: entity._organizationId,
    _subscriberId: entity._subscriberId,
    _templateId: entity._templateId,
    channels: entity.channels,
    createdAt: entity.createdAt,
    jobs: entity.jobs.map(mapJobToDto),
    tags: entity.tags,
    transactionId: entity.transactionId,
    updatedAt: entity.updatedAt,
    controls: entity.controls,
    payload: entity.payload,
    to: entity.to,
    subscriber: entity.subscriber ? buildSubscriberDto(entity.subscriber) : undefined,
    template: entity.template ? buildTemplate(entity.template) : undefined,
  };
}

function mapChildFilterToDto(filterPart: FilterParts): FilterPartsDto {
  switch (filterPart.on) {
    case FilterPartTypeEnum.SUBSCRIBER:
    case FilterPartTypeEnum.PAYLOAD:
      return {
        ...filterPart,
        on: filterPart.on, // Ensure the correct enum value is set
      } as FieldFilterPartDto;

    case FilterPartTypeEnum.WEBHOOK:
      return {
        ...filterPart,
        on: FilterPartTypeEnum.WEBHOOK,
      } as WebhookFilterPartDto;

    case FilterPartTypeEnum.IS_ONLINE:
      return {
        ...filterPart,
        on: FilterPartTypeEnum.IS_ONLINE,
      } as RealtimeOnlineFilterPartDto;

    case FilterPartTypeEnum.IS_ONLINE_IN_LAST:
      return {
        ...filterPart,
        on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
      } as OnlineInLastFilterPartDto;

    case FilterPartTypeEnum.PREVIOUS_STEP:
      return {
        ...filterPart,
        on: FilterPartTypeEnum.PREVIOUS_STEP,
      } as PreviousStepFilterPartDto;

    case FilterPartTypeEnum.TENANT:
      return {
        ...filterPart,
        on: FilterPartTypeEnum.TENANT,
      } as TenantFilterPartDto;

    default:
      throw new Error(`Unknown filter part type: ${filterPart}`);
  }
}

function mapToFilterDto(stepFilter: StepFilter): StepFilterDto {
  return {
    children: stepFilter.children.map((child) => mapChildFilterToDto(child)),
    isNegated: stepFilter.isNegated,
    type: stepFilter.type,
    value: stepFilter.value,
  };
}

function convertStepToResponse(step: NotificationStepEntity): ActivityNotificationStepResponseDto {
  const responseDto = new ActivityNotificationStepResponseDto();

  responseDto._id = step._id || '';
  responseDto.active = step.active || false;
  responseDto.replyCallback = step.replyCallback;
  responseDto.controlVariables = step.controlVariables;
  responseDto.metadata = step.metadata;
  responseDto.issues = step.issues;
  responseDto._templateId = step._templateId || '';
  responseDto.name = step.name;
  responseDto._parentId = step._parentId || null;

  // Map filters
  responseDto.filters = (step.filters || []).map(mapToFilterDto);

  // Map template if exists
  if (step.template) {
    const messageTemplateDto = new MessageTemplateDto();
    messageTemplateDto.type = step.template.type;
    messageTemplateDto.content = step.template.content;
    messageTemplateDto.contentType = step.template.contentType;
    messageTemplateDto.cta = step.template.cta;
    messageTemplateDto.actor = step.template.actor;
    messageTemplateDto.variables = step.template.variables;
    messageTemplateDto._feedId = step.template._feedId;
    messageTemplateDto._layoutId = step.template._layoutId;
    messageTemplateDto.name = step.template.name;
    messageTemplateDto.subject = step.template.subject;
    messageTemplateDto.title = step.template.title;
    messageTemplateDto.preheader = step.template.preheader;
    messageTemplateDto.senderName = step.template.senderName;
    messageTemplateDto._creatorId = step.template._creatorId;

    responseDto.template = messageTemplateDto;
  }

  if (step.variants) {
    responseDto.variants = step.variants.map((variant) => convertStepToResponse(variant));
  }

  return responseDto;
}

function isDigestRegularMetadata(item: IWorkflowStepMetadata): item is IDigestRegularMetadata {
  return item.type === DigestTypeEnum.REGULAR || item.type === DigestTypeEnum.BACKOFF;
}

function isDigestTimedMetadata(item: IWorkflowStepMetadata): item is IDigestTimedMetadata {
  return item.type === DigestTypeEnum.TIMED;
}

function mapDigest(
  digestItem?: IWorkflowStepMetadata & {
    events?: any[];
  }
): DigestMetadataDto | undefined {
  if (!digestItem) {
    return undefined;
  }
  // Type guarding and mapping based on the type of item
  if (isDigestRegularMetadata(digestItem)) {
    // If it's IDigestRegularMetadata
    return {
      digestKey: digestItem.digestKey,
      amount: digestItem.amount,
      unit: digestItem.unit,
      events: digestItem.events || [], // Default to an empty array if no events are provided
      type: digestItem.type, // Set the type as either REGULAR or BACKOFF
      backoff: digestItem.backoff,
      backoffAmount: digestItem.backoffAmount,
      backoffUnit: digestItem.backoffUnit,
      updateMode: digestItem.updateMode, // Set update mode if available
    };
  }
  if (isDigestTimedMetadata(digestItem)) {
    return {
      digestKey: digestItem.digestKey,
      amount: digestItem.amount,
      unit: digestItem.unit,
      events: digestItem.events || [], // Default to an empty array if no events are provided
      type: DigestTypeEnum.TIMED, // Set the type as TIMED
      timed: {
        atTime: digestItem.timed?.atTime,
        weekDays: digestItem.timed?.weekDays,
        monthDays: digestItem.timed?.monthDays,
        ordinal: digestItem.timed?.ordinal,
        ordinalValue: digestItem.timed?.ordinalValue,
        monthlyType: digestItem.timed?.monthlyType,
        cronExpression: digestItem.timed?.cronExpression,
      },
    };
  }

  return undefined;
}

function mapJobToDto(item: JobFeedItem): ActivityNotificationJobResponseDto {
  return {
    _id: item._id,
    type: item.type as StepTypeEnum,
    digest: mapDigest(item.digest),
    executionDetails: item.executionDetails.map(convertExecutionDetail),
    step: convertStepToResponse(item.step),
    payload: item.payload,
    providerId: item.providerId as ProvidersIdEnum,
    status: item.status,
    updatedAt: item.updatedAt,
  };
}

function convertExecutionDetail(entity: ExecutionDetailFeedItem): ActivityNotificationExecutionDetailResponseDto {
  return {
    _id: entity._id,
    detail: entity.detail,
    isRetry: entity.isRetry,
    isTest: entity.isTest,
    providerId: entity.providerId as unknown as ProvidersIdEnum,
    source: entity.source,
    status: entity.status,
    raw: entity.raw || undefined,
    createdAt: entity.createdAt,
  };
}
