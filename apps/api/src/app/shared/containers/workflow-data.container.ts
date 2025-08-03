import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import { buildWorkflowPreferences, ControlValuesLevelEnum, PreferencesTypeEnum } from '@novu/shared';
import { StepResponseDto } from '../../workflows-v2/dtos';
import { WorkflowResponseDto } from '../../workflows-v2/dtos/workflow-response.dto';
import { toResponseWorkflowDto } from '../../workflows-v2/mappers/notification-template-mapper';
import { BuildStepDataUsecase } from '../../workflows-v2/usecases/build-step-data/build-step-data.usecase';
import { emptyJsonSchema } from '../../workflows-v2/util/jsonToSchema';

export interface IWorkflowPreferences {
  workflowResourcePreference?: PreferencesEntity;
  workflowUserPreference?: PreferencesEntity;
}

export interface IWorkflowWithControlValues {
  workflow: NotificationTemplateEntity;
  identifier: string;
  controlValues: unknown[];
  controlValuesByStep: Map<string, ControlValuesEntity>; // Indexed by stepId
  preferences?: IWorkflowPreferences;
  workflowDto?: WorkflowResponseDto; // Cached full DTO
  steps?: Map<string, StepResponseDto>; // Cached step DTOs by stepId
}

export class WorkflowDataContainer {
  private workflowsByIdentifier = new Map<string, IWorkflowWithControlValues>();
  private isDataLoaded = false;

  constructor(
    private controlValuesRepository: ControlValuesRepository,
    private workflowRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository
  ) {}

  async loadWorkflowsWithControlValues(
    workflowIdentifiers: string[],
    environmentId: string,
    organizationId: string,
    targetEnvironmentId?: string
  ): Promise<void> {
    if (this.isDataLoaded || workflowIdentifiers.length === 0) {
      return;
    }

    // Load workflows from both environments
    const environmentIds = [environmentId];
    if (targetEnvironmentId) {
      environmentIds.push(targetEnvironmentId);
    }

    const workflows = await this.workflowRepository.findWithTemplates({
      _environmentId: { $in: environmentIds },
      _organizationId: organizationId,
      'triggers.identifier': { $in: workflowIdentifiers },
    });

    // Single map to store workflow lookup information
    const workflowLookup = new Map<
      string,
      {
        objectId: string;
        identifier: string;
        environmentId: string;
      }
    >();

    const workflowObjectIds: string[] = [];

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (identifier && workflow._id) {
        const lookupKey = `${workflow._environmentId}:${identifier}`;
        workflowLookup.set(lookupKey, {
          objectId: workflow._id,
          identifier,
          environmentId: workflow._environmentId,
        });
        workflowObjectIds.push(workflow._id);
      }
    }

    const allControlValues = await this.controlValuesRepository.find({
      _environmentId: { $in: environmentIds },
      _organizationId: organizationId,
      _workflowId: { $in: workflowObjectIds },
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    const preferences = await this.preferencesRepository.find({
      _environmentId: { $in: environmentIds },
      _organizationId: organizationId,
      _templateId: { $in: workflowObjectIds },
      type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
    });

    const controlValuesByWorkflowId = new Map<string, ControlValuesEntity[]>();
    const controlValuesByWorkflowAndStep = new Map<string, Map<string, ControlValuesEntity>>();

    // Helper function to find workflow info by object ID
    const findWorkflowByObjectId = (objectId: string, environmentId: string) => {
      for (const [key, info] of workflowLookup) {
        if (info.objectId === objectId && info.environmentId === environmentId) {
          return { key, ...info };
        }
      }
      return null;
    };

    for (const cv of allControlValues) {
      const workflowObjectId = cv._workflowId;
      if (!workflowObjectId) continue;

      const workflowInfo = findWorkflowByObjectId(workflowObjectId, cv._environmentId);
      if (workflowInfo) {
        const key = workflowInfo.key;

        if (!controlValuesByWorkflowId.has(key)) {
          controlValuesByWorkflowId.set(key, []);
        }

        const workflowControlValues = controlValuesByWorkflowId.get(key);
        if (workflowControlValues) {
          workflowControlValues.push(cv);
        }

        if (!controlValuesByWorkflowAndStep.has(key)) {
          controlValuesByWorkflowAndStep.set(key, new Map());
        }

        if (cv._stepId) {
          const stepMap = controlValuesByWorkflowAndStep.get(key);
          if (stepMap) {
            stepMap.set(cv._stepId, cv);
          }
        }
      }
    }

    const preferencesByWorkflow = new Map<string, IWorkflowPreferences>();
    for (const pref of preferences) {
      if (!pref._templateId) continue;

      const workflowInfo = findWorkflowByObjectId(pref._templateId, pref._environmentId);
      if (workflowInfo) {
        const key = workflowInfo.key;
        if (!preferencesByWorkflow.has(key)) {
          preferencesByWorkflow.set(key, {});
        }

        const workflowPrefs = preferencesByWorkflow.get(key);
        if (workflowPrefs) {
          if (pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE) {
            workflowPrefs.workflowResourcePreference = pref;
          } else if (pref.type === PreferencesTypeEnum.USER_WORKFLOW) {
            workflowPrefs.workflowUserPreference = pref;
          }
        }
      }
    }

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      const key = `${workflow._environmentId}:${identifier}`;
      const controlValuesByStep = controlValuesByWorkflowAndStep.get(key) || new Map();
      const preferences = preferencesByWorkflow.get(key);

      const userPreferences = preferences?.workflowUserPreference?.preferences
        ? buildWorkflowPreferences(preferences.workflowUserPreference.preferences)
        : null;

      const defaultPreferences = preferences?.workflowResourcePreference?.preferences
        ? buildWorkflowPreferences(preferences.workflowResourcePreference.preferences)
        : buildWorkflowPreferences(null);

      const workflowWithPreferences = {
        ...workflow,
        userPreferences,
        defaultPreferences,
      };

      const stepDtos = workflowWithPreferences.steps.map((step) => {
        const controlValues = controlValuesByStep.get(step._templateId);

        return BuildStepDataUsecase.mapToStepResponse(workflow, step, controlValues?.controls || {}, emptyJsonSchema());
      });

      const stepsMap = new Map();
      for (const stepDto of stepDtos) {
        stepsMap.set(stepDto._id, stepDto);
      }

      this.workflowsByIdentifier.set(key, {
        workflow,
        identifier,
        controlValues: controlValuesByWorkflowId.get(key) || [],
        controlValuesByStep,
        preferences,
        workflowDto: toResponseWorkflowDto(workflowWithPreferences, stepDtos),
        steps: stepsMap,
      });
    }

    this.isDataLoaded = true;
  }

  private makeKey(environmentId: string, identifier: string): string {
    return `${environmentId}:${identifier}`;
  }

  getWorkflowData(identifier: string, environmentId: string): IWorkflowWithControlValues | undefined {
    return this.workflowsByIdentifier.get(this.makeKey(environmentId, identifier));
  }

  getWorkflowDataByIdentifierOrId(
    identifierOrId: string,
    environmentId: string
  ): IWorkflowWithControlValues | undefined {
    const byIdentifier = this.getWorkflowData(identifierOrId, environmentId);
    if (byIdentifier) {
      return byIdentifier;
    }

    for (const [, workflowData] of this.workflowsByIdentifier) {
      if (workflowData.workflow._environmentId === environmentId && workflowData.workflow._id === identifierOrId) {
        return workflowData;
      }
    }

    return undefined;
  }

  getControlValuesForWorkflow(identifierOrId: string, environmentId: string): unknown[] {
    const data = this.getWorkflowDataByIdentifierOrId(identifierOrId, environmentId);

    return data?.controlValues || [];
  }

  getControlValuesForStep(
    identifierOrId: string,
    stepId: string,
    environmentId: string
  ): ControlValuesEntity | undefined {
    const data = this.getWorkflowDataByIdentifierOrId(identifierOrId, environmentId);

    return data?.controlValuesByStep?.get(stepId);
  }

  getWorkflow(identifierOrId: string, environmentId: string): NotificationTemplateEntity | undefined {
    const data = this.getWorkflowDataByIdentifierOrId(identifierOrId, environmentId);
    return data?.workflow;
  }

  hasWorkflow(identifierOrId: string, environmentId: string): boolean {
    if (this.workflowsByIdentifier.has(this.makeKey(environmentId, identifierOrId))) {
      return true;
    }

    for (const [, workflowData] of this.workflowsByIdentifier) {
      if (workflowData.workflow._environmentId === environmentId && workflowData.workflow._id === identifierOrId) {
        return true;
      }
    }

    return false;
  }

  getWorkflowDto(identifierOrId: string, environmentId: string): WorkflowResponseDto | undefined {
    const data = this.getWorkflowDataByIdentifierOrId(identifierOrId, environmentId);
    return data?.workflowDto;
  }

  getStepData(identifierOrId: string, stepId: string, environmentId: string): StepResponseDto | undefined {
    const data = this.getWorkflowDataByIdentifierOrId(identifierOrId, environmentId);
    return data?.steps?.get(stepId);
  }
}
