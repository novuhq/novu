import { IPreferenceChannels, StepTypeEnum } from '@novu/shared';
import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { MinifiedResponseWorkflowDto, StepDto, WorkflowPreferencesDto, WorkflowResponseDto } from '../dto/workflow.dto';

export class WorkflowTemplateGetMapper {
  static toResponseWorkflowDto(template: NotificationTemplateEntity): WorkflowResponseDto {
    return {
      _id: template._id,
      workflowId: template.name,
      tags: template.tags,
      active: template.active,
      payload: template.data ? { schema: template.data } : undefined, // Assuming data is mapped to payload schema
      controls: template.payloadSchema ? { schema: template.payloadSchema } : undefined,
      critical: template.critical,
      notificationGroupId: template._notificationGroupId,
      preferences: WorkflowTemplateGetMapper.toPreferences(template.preferenceSettings), // Assuming this directly maps; may need adjustment
      code: template.name, // Assuming name is used as code
      steps: template.steps.map(WorkflowTemplateGetMapper.toStepDto),
      name: template.name,
      description: template.description,
      origin: template.origin,
      updatedAt: template.updatedAt || 'Missing Updated At',
    };
  }
  static toMinifiedWorkflowDto(template: NotificationTemplateEntity): MinifiedResponseWorkflowDto {
    return {
      _id: template._id,
      workflowId: template.name,
      tags: template.tags,
      updatedAt: template.updatedAt || 'Missing Updated At',
      stepSummery: template.steps.map(WorkflowTemplateGetMapper.buildStepSummery),
    };
  }

  static toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): MinifiedResponseWorkflowDto[] {
    return templates.map(WorkflowTemplateGetMapper.toMinifiedWorkflowDto);
  }
  static toStepDto(step: NotificationStepEntity): StepDto {
    return {
      code: step.name || 'Missing Name', // Assuming name is used as code
      stepId: step._id || step.uuid || 'Missing-ID', // Assuming _id is used as stepId
      type: step.template?.type || StepTypeEnum.EMAIL, // Assuming type is directly available; adjust as necessary
      controls: this.convertControls(step),
      replyCallback: this.convertReplyCallBack(step),
      active: step.active,
      shouldStopOnFail: step.shouldStopOnFail,
    };
  }

  private static convertReplyCallBack(step: NotificationStepEntity) {
    return step.replyCallback ? { active: step.replyCallback.active, url: step.replyCallback.url } : undefined;
  }

  private static convertControls(step: NotificationStepEntity) {
    return step.controls ? { schema: step.controls.schema } : undefined;
  }

  private static toPreferences(preferenceSettings: IPreferenceChannels): WorkflowPreferencesDto {
    return {
      defaultWorkflowPreference: { defaultValue: true, readOnly: false },
      channels: {
        email: { defaultValue: preferenceSettings.email || true, readOnly: false },
        sms: { defaultValue: preferenceSettings.sms || true, readOnly: false },
        push: { defaultValue: preferenceSettings.push || true, readOnly: false },
        chat: { defaultValue: preferenceSettings.chat || true, readOnly: false },
        in_app: { defaultValue: preferenceSettings.in_app || true, readOnly: false },
      },
    };
  }

  private static buildStepSummery(step: NotificationStepEntity) {
    return step.template?.type || StepTypeEnum.EMAIL;
  }
}
