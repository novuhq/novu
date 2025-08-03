import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import { ControlValuesLevelEnum, PreferencesTypeEnum } from '@novu/shared';
import { StepResponseDto } from '../../workflows-v2/dtos';
import { WorkflowResponseDto } from '../../workflows-v2/dtos/workflow-response.dto';

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
    private preferencesRepository?: PreferencesRepository
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

    const workflows = await this.workflowRepository.find({
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

    // Load ALL control values (not just those with layoutId)
    const allControlValues = await this.controlValuesRepository.find({
      _environmentId: { $in: environmentIds },
      _organizationId: organizationId,
      _workflowId: { $in: workflowObjectIds },
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    // Load preferences in bulk if repository is available
    let preferences: PreferencesEntity[] = [];
    if (this.preferencesRepository) {
      preferences = await this.preferencesRepository.find({
        _environmentId: { $in: environmentIds },
        _organizationId: organizationId,
        _templateId: { $in: workflowObjectIds },
        type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
      });
    }

    // Organize control values by workflow and step
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

    // Organize preferences by workflow
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

    // Store everything in the container
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
          steps: new Map(),
        });
      }
    }

    this.isDataLoaded = true;
  }

  private makeKey(environmentId: string, identifier: string): string {
    return `${environmentId}:${identifier}`;
  }

  getWorkflowData(identifier: string, environmentId?: string): IWorkflowWithControlValues | undefined {
    if (environmentId) {
      return this.workflowsByIdentifier.get(this.makeKey(environmentId, identifier));
    }
    // Fallback to searching without environment prefix for backward compatibility
    return this.workflowsByIdentifier.get(identifier);
  }

  getControlValuesForWorkflow(identifier: string, environmentId?: string): unknown[] {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.controlValues || [];
  }

  getControlValuesForStep(identifier: string, stepId: string, environmentId?: string): ControlValuesEntity | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.controlValuesByStep?.get(stepId);
  }

  getWorkflow(identifier: string, environmentId?: string): NotificationTemplateEntity | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.workflow;
  }

  hasWorkflow(identifier: string, environmentId?: string): boolean {
    if (environmentId) {
      return this.workflowsByIdentifier.has(this.makeKey(environmentId, identifier));
    }
    return this.workflowsByIdentifier.has(identifier);
  }

  getAllLoadedIdentifiers(): string[] {
    return Array.from(this.workflowsByIdentifier.keys());
  }

  // Preferences methods
  getPreferencesForWorkflow(identifier: string, environmentId?: string): IWorkflowPreferences | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.preferences;
  }

  setPreferencesForWorkflow(identifier: string, preferences: IWorkflowPreferences, environmentId?: string): void {
    const data = this.getWorkflowData(identifier, environmentId);
    if (data) {
      data.preferences = preferences;
    }
  }

  // Workflow DTO methods
  getWorkflowDto(identifier: string, environmentId?: string): WorkflowResponseDto | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.workflowDto;
  }

  setWorkflowDto(identifier: string, dto: WorkflowResponseDto, environmentId?: string): void {
    const data = this.getWorkflowData(identifier, environmentId);
    if (data) {
      data.workflowDto = dto;
    }
  }

  hasWorkflowDto(identifier: string, environmentId?: string): boolean {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.workflowDto !== undefined;
  }

  // Step data methods
  getStepData(identifier: string, stepId: string, environmentId?: string): StepResponseDto | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.steps?.get(stepId);
  }

  setStepData(identifier: string, stepId: string, stepData: StepResponseDto, environmentId?: string): void {
    const data = this.getWorkflowData(identifier, environmentId);
    if (data?.steps) {
      data.steps.set(stepId, stepData);
    }
  }

  // Legacy methods for backward compatibility
  setWorkflowDetails(identifier: string, workflowDetails: WorkflowResponseDto): void {
    // This method now maps to setWorkflowDto
    this.setWorkflowDto(identifier, workflowDetails);
  }

  getWorkflowDetails(identifier: string): WorkflowResponseDto | undefined {
    // This method now maps to getWorkflowDto
    return this.getWorkflowDto(identifier);
  }

  hasWorkflowDetails(identifier: string): boolean {
    // This method now maps to hasWorkflowDto
    return this.hasWorkflowDto(identifier);
  }

  async getWorkflowObjectIdsFromIdentifiers(
    workflowIdentifiers: string[],
    environmentId: string,
    organizationId: string
  ): Promise<{
    identifierToObjectId: Map<string, string>;
    objectIdToIdentifier: Map<string, string>;
  }> {
    const identifierToObjectId = new Map<string, string>();
    const objectIdToIdentifier = new Map<string, string>();

    for (const identifier of workflowIdentifiers) {
      const workflowData = this.getWorkflowData(identifier, environmentId);
      if (workflowData?.workflow._id) {
        identifierToObjectId.set(identifier, workflowData.workflow._id);
        objectIdToIdentifier.set(workflowData.workflow._id, identifier);
      }
    }

    if (identifierToObjectId.size < workflowIdentifiers.length) {
      const missingIdentifiers = workflowIdentifiers.filter((id) => !identifierToObjectId.has(id));
      const workflows = await this.workflowRepository.find({
        _environmentId: environmentId,
        _organizationId: organizationId,
        'triggers.identifier': { $in: missingIdentifiers },
      });

      for (const workflow of workflows) {
        const identifier = workflow.triggers?.[0]?.identifier;
        if (identifier && workflow._id) {
          identifierToObjectId.set(identifier, workflow._id);
          objectIdToIdentifier.set(workflow._id, identifier);
        }
      }
    }

    return { identifierToObjectId, objectIdToIdentifier };
  }
}
