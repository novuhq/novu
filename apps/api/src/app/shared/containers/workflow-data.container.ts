import { ControlValuesRepository, NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';

export interface IWorkflowWithControlValues {
  workflow: NotificationTemplateEntity;
  identifier: string;
  controlValues: unknown[];
  workflowDetails?: any; // Full workflow DTO for diff operations
}

export class WorkflowDataContainer {
  private workflowsByIdentifier = new Map<string, IWorkflowWithControlValues>();
  private isDataLoaded = false;

  constructor(
    private controlValuesRepository: ControlValuesRepository,
    private workflowRepository: NotificationTemplateRepository
  ) {}

  async loadWorkflowsWithControlValues(
    workflowIdentifiers: string[],
    environmentId: string,
    organizationId: string
  ): Promise<void> {
    if (this.isDataLoaded || workflowIdentifiers.length === 0) {
      return;
    }

    const workflows = await this.workflowRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      'triggers.identifier': { $in: workflowIdentifiers },
    });

    const identifierToObjectId = new Map<string, string>();
    const objectIdToIdentifier = new Map<string, string>();

    workflows.forEach((workflow) => {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (identifier && workflow._id) {
        identifierToObjectId.set(identifier, workflow._id);
        objectIdToIdentifier.set(workflow._id, identifier);
      }
    });

    const workflowObjectIds = Array.from(identifierToObjectId.values());
    const allControlValues = await this.controlValuesRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      _workflowId: { $in: workflowObjectIds },
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      'controls.layoutId': { $exists: true, $ne: null },
    });

    const controlValuesByWorkflowId = new Map<string, unknown[]>();
    allControlValues.forEach((cv) => {
      const workflowObjectId = (cv as any)._workflowId;
      const workflowIdentifier = objectIdToIdentifier.get(workflowObjectId);
      if (workflowIdentifier) {
        if (!controlValuesByWorkflowId.has(workflowIdentifier)) {
          controlValuesByWorkflowId.set(workflowIdentifier, []);
        }
        controlValuesByWorkflowId.get(workflowIdentifier)!.push(cv);
      }
    });

    workflows.forEach((workflow) => {
      const identifier = workflow.triggers?.[0]?.identifier;
      if (identifier) {
        this.workflowsByIdentifier.set(identifier, {
          workflow,
          identifier,
          controlValues: controlValuesByWorkflowId.get(identifier) || [],
        });
      }
    });

    this.isDataLoaded = true;
  }

  getWorkflowData(identifier: string): IWorkflowWithControlValues | undefined {
    return this.workflowsByIdentifier.get(identifier);
  }

  getControlValuesForWorkflow(identifier: string): unknown[] {
    return this.workflowsByIdentifier.get(identifier)?.controlValues || [];
  }

  getWorkflow(identifier: string): NotificationTemplateEntity | undefined {
    return this.workflowsByIdentifier.get(identifier)?.workflow;
  }

  hasWorkflow(identifier: string): boolean {
    return this.workflowsByIdentifier.has(identifier);
  }

  getAllLoadedIdentifiers(): string[] {
    return Array.from(this.workflowsByIdentifier.keys());
  }

  setWorkflowDetails(identifier: string, workflowDetails: any): void {
    const workflowData = this.workflowsByIdentifier.get(identifier);
    if (workflowData) {
      workflowData.workflowDetails = workflowDetails;
    }
  }

  getWorkflowDetails(identifier: string): any | undefined {
    return this.workflowsByIdentifier.get(identifier)?.workflowDetails;
  }

  hasWorkflowDetails(identifier: string): boolean {
    return this.workflowsByIdentifier.get(identifier)?.workflowDetails !== undefined;
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
      const workflowData = this.getWorkflowData(identifier);
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

      workflows.forEach((workflow) => {
        const identifier = workflow.triggers?.[0]?.identifier;
        if (identifier && workflow._id) {
          identifierToObjectId.set(identifier, workflow._id);
          objectIdToIdentifier.set(workflow._id, identifier);
        }
      });
    }

    return { identifierToObjectId, objectIdToIdentifier };
  }
}
