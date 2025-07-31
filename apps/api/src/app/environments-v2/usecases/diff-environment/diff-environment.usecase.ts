import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { BaseRepository, ControlValuesRepository, NotificationTemplateRepository } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../shared/containers/workflow-data.container';
import { DependencyAnalyzerService, EnvironmentValidationService } from '../../services';
import { IDiffResult, IEnvironmentDiffResult, ISyncStrategy } from '../../types/sync.types';
import { LayoutSyncStrategy } from '../sync-strategies/layout-sync.strategy';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';
import { DiffEnvironmentCommand } from './diff-environment.command';

@Injectable()
export class DiffEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private workflowSyncStrategy: WorkflowSyncStrategy,
    private layoutSyncStrategy: LayoutSyncStrategy,
    private dependencyAnalyzerService: DependencyAnalyzerService,
    private controlValuesRepository: ControlValuesRepository,
    private workflowRepository: NotificationTemplateRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: DiffEnvironmentCommand): Promise<IEnvironmentDiffResult> {
    try {
      if (!BaseRepository.isInternalId(command.targetEnvironmentId)) {
        throw new BadRequestException('Invalid environment ID format');
      }

      const sourceEnvironmentId =
        command.sourceEnvironmentId ||
        (await this.environmentValidationService.getDevelopmentEnvironmentId(command.user.organizationId));

      await this.environmentValidationService.validateEnvironments({
        sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
      });

      this.logger.info(`Starting environment diff between ${sourceEnvironmentId} and ${command.targetEnvironmentId}`);

      // Create workflow data container and pre-load workflow data for optimization
      const workflowDataContainer = new WorkflowDataContainer(this.controlValuesRepository, this.workflowRepository);

      // Pre-load workflow identifiers from source environment
      const sourceWorkflows = await this.workflowRepository.find({
        _environmentId: sourceEnvironmentId,
        _organizationId: command.user.organizationId,
      });

      const workflowIdentifiers = sourceWorkflows
        .map((workflow) => workflow.triggers?.[0]?.identifier)
        .filter((id): id is string => id !== null && id !== undefined);

      if (workflowIdentifiers.length > 0) {
        this.logger.info(`Pre-loading data for ${workflowIdentifiers.length} workflows before diff`);
        await workflowDataContainer.loadWorkflowsWithControlValues(
          workflowIdentifiers,
          sourceEnvironmentId,
          command.user.organizationId
        );
      }

      // Execute diff with workflow container optimization and layout strategy normally
      const [workflowDiffResults, layoutDiffResults] = await Promise.all([
        this.workflowSyncStrategy.diff(
          sourceEnvironmentId,
          command.targetEnvironmentId,
          command.user.organizationId,
          command.user,
          workflowDataContainer
        ),
        this.layoutSyncStrategy.diff(
          sourceEnvironmentId,
          command.targetEnvironmentId,
          command.user.organizationId,
          command.user
        ),
      ]);

      const resources = [...workflowDiffResults, ...layoutDiffResults];

      const dependencyMap = await this.dependencyAnalyzerService.analyzeDependencies(
        resources,
        command.targetEnvironmentId,
        command.user.organizationId,
        workflowDataContainer
      );

      // Add dependencies to resources
      for (const resource of resources) {
        if (resource.sourceResource?.id && dependencyMap.has(resource.sourceResource.id)) {
          resource.dependencies = dependencyMap.get(resource.sourceResource.id);
        }
        // Check target resource ID for deleted resources (sourceResource is null, targetResource exists)
        if (!resource.sourceResource && resource.targetResource?.id && dependencyMap.has(resource.targetResource.id)) {
          resource.dependencies = dependencyMap.get(resource.targetResource.id);
        }
      }

      const summary = this.calculateSummary(resources);

      this.logger.info(
        `Environment diff completed. Total entities: ${summary.totalEntities}, ` +
          `Total changes: ${summary.totalChanges}, Has changes: ${summary.hasChanges}`
      );

      return {
        sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        resources,
        summary,
      };
    } catch (error) {
      this.logger.error('Environment diff failed', error);
      throw error;
    }
  }

  private async executeDiff(
    strategies: ISyncStrategy[],
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    const results: IDiffResult[] = [];

    for (const strategy of strategies) {
      const strategyResults = await strategy.diff(sourceEnvId, targetEnvId, organizationId, userContext);
      results.push(...strategyResults);
    }

    return results;
  }

  private calculateSummary(resources: IDiffResult[]) {
    const summary = {
      totalEntities: 0,
      totalChanges: 0,
      hasChanges: false,
    };

    for (const resource of resources) {
      summary.totalEntities += 1; // Each resource is now a single entity (workflow)

      // Count all changes (both workflow and step level)
      const entitySummary = resource.summary;
      summary.totalChanges += entitySummary.added + entitySummary.modified + entitySummary.deleted;
    }

    summary.hasChanges = summary.totalChanges > 0;

    return summary;
  }
}
