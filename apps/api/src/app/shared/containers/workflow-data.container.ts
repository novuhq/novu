import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import { ControlValuesLevelEnum, PreferencesTypeEnum, UserSessionData } from '@novu/shared';
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
    userContext: UserSessionData,
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

    const identifierToObjectId = new Map<string, string>();
    const objectIdToIdentifier = new Map<string, string>();

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (identifier && workflow._id) {
        identifierToObjectId.set(`${workflow._environmentId}:${identifier}`, workflow._id);
        objectIdToIdentifier.set(workflow._id, identifier);
      }
    }

    const workflowObjectIds = Array.from(identifierToObjectId.values());

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

    for (const cv of allControlValues) {
      const workflowObjectId = cv._workflowId;
      if (!workflowObjectId) continue;

      const workflowIdentifier = objectIdToIdentifier.get(workflowObjectId);
      if (workflowIdentifier) {
        const key = `${cv._environmentId}:${workflowIdentifier}`;

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
      const workflowIdentifier = objectIdToIdentifier.get(pref._templateId);
      if (workflowIdentifier) {
        const key = `${pref._environmentId}:${workflowIdentifier}`;
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
      if (identifier) {
        const key = `${workflow._environmentId}:${identifier}`;
        this.workflowsByIdentifier.set(key, {
          workflow,
          identifier,
          controlValues: controlValuesByWorkflowId.get(key) || [],
          controlValuesByStep: controlValuesByWorkflowAndStep.get(key) || new Map(),
          preferences: preferencesByWorkflow.get(key),
          workflowDto: undefined, // Will be populated below
          steps: new Map(),
        });
      }
    }

    await this.preComputeWorkflowDtos(userContext);

    this.isDataLoaded = true;
  }

  private async preComputeWorkflowDtos(_userContext: UserSessionData): Promise<void> {
    for (const [, workflowData] of this.workflowsByIdentifier) {
      const workflowWithPreferences = {
        ...workflowData.workflow,
        userPreferences: workflowData.preferences?.workflowUserPreference?.preferences || null,
        defaultPreferences: workflowData.preferences?.workflowResourcePreference?.preferences || null,
      };

      // Map steps to step DTOs using bulk-loaded control values
      const stepDtos = workflowWithPreferences.steps.map((step) => {
        const controlValues = workflowData.controlValuesByStep.get(step._templateId);

        return BuildStepDataUsecase.mapToStepResponse(
          workflowData.workflow,
          step,
          controlValues?.controls || {},
          emptyJsonSchema() // Will be populated later if needed
        );
      });

      // Cache step DTOs
      for (const stepDto of stepDtos) {
        if (workflowData.steps) {
          workflowData.steps.set(stepDto._id, stepDto);
        }
      }

      const workflowDto = toResponseWorkflowDto(workflowWithPreferences as any, stepDtos);
      workflowData.workflowDto = workflowDto;
    }
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
