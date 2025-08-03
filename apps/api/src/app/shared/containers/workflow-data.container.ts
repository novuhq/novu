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
  private workflowsByObjectId = new Map<string, string>(); // objectId:environmentId -> key
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
    targetEnvironmentId: string
  ): Promise<void> {
    if (this.isDataLoaded || workflowIdentifiers.length === 0) {
      return;
    }

    const environmentIds = [environmentId, targetEnvironmentId];

    const workflows = await this.workflowRepository.findWithTemplates({
      _environmentId: { $in: environmentIds },
      _organizationId: organizationId,
      'triggers.identifier': { $in: workflowIdentifiers },
    });

    // Create efficient lookup maps
    const workflowLookup = new Map<string, { objectId: string; identifier: string; environmentId: string }>();
    const objectIdToKeyLookup = new Map<string, string>();
    const workflowObjectIds: string[] = [];

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (identifier && workflow._id) {
        const lookupKey = `${workflow._environmentId}:${identifier}`;
        const objectIdKey = `${workflow._id}:${workflow._environmentId}`;

        workflowLookup.set(lookupKey, {
          objectId: workflow._id,
          identifier,
          environmentId: workflow._environmentId,
        });
        objectIdToKeyLookup.set(objectIdKey, lookupKey);
        workflowObjectIds.push(workflow._id);
      }
    }

    const [allControlValues, preferences] = await Promise.all([
      this.controlValuesRepository.find({
        _environmentId: { $in: environmentIds },
        _organizationId: organizationId,
        _workflowId: { $in: workflowObjectIds },
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      }),
      this.preferencesRepository.find({
        _environmentId: { $in: environmentIds },
        _organizationId: organizationId,
        _templateId: { $in: workflowObjectIds },
        type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
      }),
    ]);

    // Initialize maps with better structure
    const controlValuesByWorkflowId = new Map<string, ControlValuesEntity[]>();
    const controlValuesByWorkflowAndStep = new Map<string, Map<string, ControlValuesEntity>>();
    const preferencesByWorkflow = new Map<string, IWorkflowPreferences>();

    for (const cv of allControlValues) {
      if (!cv._workflowId) continue;

      const lookupKey = objectIdToKeyLookup.get(`${cv._workflowId}:${cv._environmentId}`);
      if (!lookupKey) continue;

      // Initialize arrays/maps if needed
      if (!controlValuesByWorkflowId.has(lookupKey)) {
        controlValuesByWorkflowId.set(lookupKey, []);
      }
      if (!controlValuesByWorkflowAndStep.has(lookupKey)) {
        controlValuesByWorkflowAndStep.set(lookupKey, new Map());
      }

      const workflowControlValues = controlValuesByWorkflowId.get(lookupKey);
      if (workflowControlValues) {
        workflowControlValues.push(cv);
      }

      if (cv._stepId) {
        const stepMap = controlValuesByWorkflowAndStep.get(lookupKey);
        if (stepMap) {
          stepMap.set(cv._stepId, cv);
        }
      }
    }

    for (const pref of preferences) {
      if (!pref._templateId) continue;

      const lookupKey = objectIdToKeyLookup.get(`${pref._templateId}:${pref._environmentId}`);
      if (!lookupKey) continue;

      if (!preferencesByWorkflow.has(lookupKey)) {
        preferencesByWorkflow.set(lookupKey, {});
      }

      const workflowPrefs = preferencesByWorkflow.get(lookupKey);
      if (workflowPrefs) {
        if (pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE) {
          workflowPrefs.workflowResourcePreference = pref;
        } else if (pref.type === PreferencesTypeEnum.USER_WORKFLOW) {
          workflowPrefs.workflowUserPreference = pref;
        }
      }
    }

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (!identifier) continue;

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

      // Create steps map more efficiently
      const stepsMap = new Map(stepDtos.map((stepDto) => [stepDto._id, stepDto]));

      this.workflowsByIdentifier.set(key, {
        workflow,
        identifier,
        controlValues: controlValuesByWorkflowId.get(key) || [],
        controlValuesByStep,
        preferences,
        workflowDto: toResponseWorkflowDto(workflowWithPreferences, stepDtos),
        steps: stepsMap,
      });

      if (workflow._id) {
        this.workflowsByObjectId.set(`${workflow._id}:${workflow._environmentId}`, key);
      }
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
    // Try identifier-based lookup first
    const byIdentifier = this.getWorkflowData(identifierOrId, environmentId);
    if (byIdentifier) {
      return byIdentifier;
    }

    const keyByObjectId = this.workflowsByObjectId.get(`${identifierOrId}:${environmentId}`);
    if (keyByObjectId) {
      return this.workflowsByIdentifier.get(keyByObjectId);
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

    return this.workflowsByObjectId.has(`${identifierOrId}:${environmentId}`);
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
