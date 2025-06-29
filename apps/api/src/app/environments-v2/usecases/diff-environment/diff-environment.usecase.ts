import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { EnvironmentRepository, BaseRepository } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { DiffEnvironmentCommand } from './diff-environment.command';
import { ResourceTypeEnum, ISyncStrategy, IEnvironmentDiffResult, IDiffResult } from '../../types/sync.types';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class DiffEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: DiffEnvironmentCommand): Promise<IEnvironmentDiffResult> {
    try {
      await this.validateEnvironments(command);

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

  private async validateEnvironments(command: DiffEnvironmentCommand): Promise<void> {
    if (command.sourceEnvironmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Source and target environments cannot be the same');
    }

    // Validate ObjectId format
    if (
      !BaseRepository.isInternalId(command.sourceEnvironmentId) ||
      !BaseRepository.isInternalId(command.targetEnvironmentId)
    ) {
      throw new BadRequestException('Invalid environment ID format');
    }

    const [sourceEnv, targetEnv] = await Promise.all([
      this.environmentRepository.findOne({
        _id: command.sourceEnvironmentId,
        _organizationId: command.user.organizationId,
      }),
      this.environmentRepository.findOne({
        _id: command.targetEnvironmentId,
        _organizationId: command.user.organizationId,
      }),
    ]);

    if (!sourceEnv) {
      throw new BadRequestException('Source environment not found');
    }

    if (!targetEnv) {
      throw new BadRequestException('Target environment not found');
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
