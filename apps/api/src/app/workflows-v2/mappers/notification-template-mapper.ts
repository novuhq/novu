import { DEFAULT_WORKFLOW_PREFERENCES, PreferencesTypeEnum, StepTypeEnum, WorkflowOriginEnum } from '@novu/shared';
import { ControlValuesEntity, NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { GetPreferencesResponseDto } from '@novu/application-generic';

import {
  ControlsSchema,
  MinifiedResponseWorkflowDto,
  PreferencesResponseDto,
  StepResponseDto,
} from '../dto/workflow-commons-fields';
import { WorkflowResponseDto } from '../dto/workflow-response-dto';

export class NotificationTemplateMapper {
  static toResponseWorkflowDto(
    template: NotificationTemplateEntity,
    preferences: GetPreferencesResponseDto | undefined,
    stepIdToControlValuesMap: { [p: string]: ControlValuesEntity }
  ): WorkflowResponseDto {
    const preferencesDto: PreferencesResponseDto = {
      user: preferences?.source[PreferencesTypeEnum.USER_WORKFLOW] || null,
      default: preferences?.source[PreferencesTypeEnum.WORKFLOW_RESOURCE] || DEFAULT_WORKFLOW_PREFERENCES,
    };

    return {
      _id: template._id,
      tags: template.tags,
      active: template.active,
      preferences: preferencesDto,
      steps: NotificationTemplateMapper.getSteps(template, stepIdToControlValuesMap),
      name: template.name,
      description: template.description,
      origin: template.origin || WorkflowOriginEnum.NOVU,
      updatedAt: template.updatedAt || 'Missing Updated At',
      createdAt: template.createdAt || 'Missing Create At',
    };
  }

  private static getSteps(
    template: NotificationTemplateEntity,
    controlValuesMap: { [p: string]: ControlValuesEntity }
  ) {
    const steps: StepResponseDto[] = [];
    for (const step of template.steps) {
      const toStepResponseDto = NotificationTemplateMapper.toStepResponseDto(step);
      const controlValues = controlValuesMap[step._templateId];
      if (controlValues?.controls && Object.entries(controlValues?.controls).length) {
        toStepResponseDto.controlValues = controlValues.controls;
      }
      steps.push(toStepResponseDto);
    }

    return steps;
  }

  static toMinifiedWorkflowDto(template: NotificationTemplateEntity): MinifiedResponseWorkflowDto {
    return {
      _id: template._id,
      name: template.name,
      tags: template.tags,
      updatedAt: template.updatedAt || 'Missing Updated At',
      stepTypeOverviews: template.steps
        .map(NotificationTemplateMapper.buildStepTypeOverview)
        .filter((stepTypeEnum) => !!stepTypeEnum),
      createdAt: template.createdAt || 'Missing Create At',
    };
  }

  static toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): MinifiedResponseWorkflowDto[] {
    return templates.map(NotificationTemplateMapper.toMinifiedWorkflowDto);
  }
  static toStepResponseDto(step: NotificationStepEntity): StepResponseDto {
    return {
      name: step.name || 'Missing Name',
      stepUuid: step._templateId,
      type: step.template?.type || StepTypeEnum.EMAIL,
      controls: NotificationTemplateMapper.convertControls(step),
      controlValues: step.controlVariables || {},
    };
  }

  private static convertControls(step: NotificationStepEntity): ControlsSchema | undefined {
    if (step.template?.controls) {
      return { schema: step.template.controls.schema };
    } else {
      return undefined;
    }
  }

  private static buildStepTypeOverview(step: NotificationStepEntity): StepTypeEnum | undefined {
    return step.template?.type;
  }
}
