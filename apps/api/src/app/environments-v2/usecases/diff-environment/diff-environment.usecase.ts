import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { BaseRepository } from '@novu/dal';
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

      /*
       * For now, we only support workflow diff
       * In the future, we can add more strategies here
       */
      const strategies = [this.workflowSyncStrategy];

      const resources = await this.executeDiff(
        strategies,
        sourceEnvironmentId,
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
