import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import {
  buildWorkflowPreferences,
  ControlValuesLevelEnum,
  PreferencesTypeEnum,
  WorkflowPreferences,
} from '@novu/shared';
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
  controlValuesByStep: Map<string, ControlValuesEntity>;
  preferences?: IWorkflowPreferences;
  workflowDto?: WorkflowResponseDto;
  steps?: Map<string, StepResponseDto>;
}

type WorkflowLookupData = {
  objectId: string;
  identifier: string;
  environmentId: string;
};

export class WorkflowDataContainer {
  private workflowsByIdentifier = new Map<string, IWorkflowWithControlValues>();
  private isDataLoaded = false;

  constructor(
    private controlValuesRepository: ControlValuesRepository,
    private preferencesRepository: PreferencesRepository
  ) {}

  async loadWorkflowsWithControlValues(
    workflows: NotificationTemplateEntity[],
    environmentId: string,
    organizationId: string,
    targetEnvironmentId: string
  ): Promise<void> {
    if (this.isDataLoaded) {
      return;
    }

    if (workflows.length === 0) {
      this.isDataLoaded = true;
      return;
    }

    const environmentIds = [environmentId, targetEnvironmentId];

    const lookupMaps = this.buildLookupMaps(workflows);

    const [controlValues, preferences] = await this.fetchRelatedData(
      Array.from(lookupMaps.workflowLookup.values()).map((data) => data.objectId),
      environmentIds,
      organizationId
    );

    const controlValuesByWorkflowAndStep = this.organizeControlValues(controlValues, lookupMaps.objectIdToKey);
    const preferencesByWorkflow = this.organizePreferences(preferences, lookupMaps.objectIdToKey);

    this.processWorkflows(workflows, controlValuesByWorkflowAndStep, preferencesByWorkflow);
    this.isDataLoaded = true;
  }

  private buildLookupMaps(workflows: NotificationTemplateEntity[]) {
    const workflowLookup = new Map<string, WorkflowLookupData>();
    const objectIdToKey = new Map<string, string>();

    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (!identifier || !workflow._id) continue;

      const lookupKey = this.makeKey(workflow._environmentId, identifier);
      const objectIdKey = `${workflow._id}:${workflow._environmentId}`;

      workflowLookup.set(lookupKey, {
        objectId: workflow._id,
        identifier,
        environmentId: workflow._environmentId,
      });
      objectIdToKey.set(objectIdKey, lookupKey);
    }

    return { workflowLookup, objectIdToKey };
  }

  private async fetchRelatedData(
    workflowObjectIds: string[],
    environmentIds: string[],
    organizationId: string
  ): Promise<[ControlValuesEntity[], PreferencesEntity[]]> {
    return Promise.all([
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
  }

  private organizeControlValues(controlValues: ControlValuesEntity[], objectIdToKey: Map<string, string>) {
    const byWorkflowAndStep = new Map<string, Map<string, ControlValuesEntity>>();

    for (const cv of controlValues) {
      if (!cv._workflowId || !cv._stepId) continue;

      const lookupKey = objectIdToKey.get(`${cv._workflowId}:${cv._environmentId}`);
      if (!lookupKey) continue;

      this.ensureMapEntry(byWorkflowAndStep, lookupKey, new Map()).set(cv._stepId, cv);
    }

    return byWorkflowAndStep;
  }

  private organizePreferences(
    preferences: PreferencesEntity[],
    objectIdToKey: Map<string, string>
  ): Map<string, IWorkflowPreferences> {
    const byWorkflow = new Map<string, IWorkflowPreferences>();

    for (const pref of preferences) {
      if (!pref._templateId) continue;

      const lookupKey = objectIdToKey.get(`${pref._templateId}:${pref._environmentId}`);
      if (!lookupKey) continue;

      const workflowPrefs = this.ensureMapEntry(byWorkflow, lookupKey, {});

      if (pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE) {
        workflowPrefs.workflowResourcePreference = pref;
      } else if (pref.type === PreferencesTypeEnum.USER_WORKFLOW) {
        workflowPrefs.workflowUserPreference = pref;
      }
    }

    return byWorkflow;
  }

  private processWorkflows(
    workflows: NotificationTemplateEntity[],
    controlValuesByWorkflowAndStep: Map<string, Map<string, ControlValuesEntity>>,
    preferencesByWorkflow: Map<string, IWorkflowPreferences>
  ) {
    for (const workflow of workflows) {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (!identifier) continue;

      const key = this.makeKey(workflow._environmentId, identifier);
      const controlValuesByStep = controlValuesByWorkflowAndStep.get(key) || new Map();
      const preferences = preferencesByWorkflow.get(key);

      const workflowWithPreferences = this.buildWorkflowWithPreferences(workflow, preferences);
      const stepDtos = this.buildStepDtos(workflow, workflowWithPreferences, controlValuesByStep);

      this.storeWorkflowData(key, workflow, identifier, {
        controlValuesByStep,
        preferences,
        workflowDto: toResponseWorkflowDto(workflowWithPreferences, stepDtos),
        steps: new Map(stepDtos.map((step) => [step._id, step])),
      });
    }
  }

  private buildWorkflowWithPreferences(workflow: NotificationTemplateEntity, preferences?: IWorkflowPreferences) {
    const userPreferences = preferences?.workflowUserPreference?.preferences
      ? buildWorkflowPreferences(preferences.workflowUserPreference.preferences)
      : null;

    const defaultPreferences = preferences?.workflowResourcePreference?.preferences
      ? buildWorkflowPreferences(preferences.workflowResourcePreference.preferences)
      : buildWorkflowPreferences(null);

    return {
      ...workflow,
      userPreferences,
      defaultPreferences,
    };
  }

  private buildStepDtos(
    workflow: NotificationTemplateEntity,
    workflowWithPreferences: NotificationTemplateEntity & {
      userPreferences: WorkflowPreferences | null;
      defaultPreferences: WorkflowPreferences;
    },
    controlValuesByStep: Map<string, ControlValuesEntity>
  ): StepResponseDto[] {
    return workflowWithPreferences.steps.map((step) => {
      const controlValues = controlValuesByStep.get(step._templateId);

      return BuildStepDataUsecase.mapToStepResponse(workflow, step, controlValues?.controls || {}, emptyJsonSchema());
    });
  }

  private storeWorkflowData(
    key: string,
    workflow: NotificationTemplateEntity,
    identifier: string,
    data: Omit<IWorkflowWithControlValues, 'workflow' | 'identifier'>
  ) {
    this.workflowsByIdentifier.set(key, {
      workflow,
      identifier,
      ...data,
    });
  }

  private ensureMapEntry<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
    if (!map.has(key)) {
      map.set(key, defaultValue);
    }

    return map.get(key) ?? defaultValue;
  }

  private makeKey(environmentId: string, identifier: string): string {
    return `${environmentId}:${identifier}`;
  }

  getWorkflowData(identifier: string, environmentId: string): IWorkflowWithControlValues | undefined {
    // First try to find by identifier
    const data = this.workflowsByIdentifier.get(this.makeKey(environmentId, identifier));
    if (data) {
      return data;
    }

    // Fallback: search by MongoDB workflow ID
    for (const workflowData of this.workflowsByIdentifier.values()) {
      if (workflowData.workflow._id === identifier && workflowData.workflow._environmentId === environmentId) {
        return workflowData;
      }
    }

    return undefined;
  }

  getWorkflowDto(identifier: string, environmentId: string): WorkflowResponseDto | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.workflowDto;
  }

  getStepData(identifier: string, stepId: string, environmentId: string): StepResponseDto | undefined {
    const data = this.getWorkflowData(identifier, environmentId);
    return data?.steps?.get(stepId);
  }

  getWorkflowsByEnvironment(environmentId: string): NotificationTemplateEntity[] {
    const workflows: NotificationTemplateEntity[] = [];

    for (const workflowData of this.workflowsByIdentifier.values()) {
      if (workflowData.workflow._environmentId === environmentId) {
        workflows.push(workflowData.workflow);
      }
    }

    return workflows;
  }
}
