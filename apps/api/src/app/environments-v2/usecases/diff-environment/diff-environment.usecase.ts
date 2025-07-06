import { Injectable } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { DiffEnvironmentCommand } from './diff-environment.command';
import { ResourceTypeEnum, ISyncStrategy, IEnvironmentDiffResult, IDiffResult } from '../../types/sync.types';
import { EnvironmentValidationService } from '../../services';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class DiffEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: DiffEnvironmentCommand): Promise<IEnvironmentDiffResult> {
    try {
      await this.environmentValidationService.validateEnvironments({
        sourceEnvironmentId: command.sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
      });

      this.logger.info(
        `Starting environment diff between ${command.sourceEnvironmentId} and ${command.targetEnvironmentId}`
      );

      /*
       * For now, we only support workflow diff
       * In the future, we can add more strategies here
       */
      const strategies = [this.workflowSyncStrategy];

      const resources = await this.executeDiff(
        strategies,
        command.sourceEnvironmentId,
        command.targetEnvironmentId,
        command.user.organizationId,
        command.user
      );

      const summary = this.calculateSummary(resources);

      this.logger.info(
        `Environment diff completed. Total entities: ${summary.totalEntities}, ` +
          `Total changes: ${summary.totalChanges}, Has changes: ${summary.hasChanges}`
      );

      return {
        sourceEnvironmentId: command.sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        resources,
        summary,
      };
    } catch (error) {
      this.logger.error(`Environment diff failed: ${error.message}`);
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
