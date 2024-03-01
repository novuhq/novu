import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';

import { JobRepository, JobStatusEnum } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';

import { ApiException, PlatformException } from '../../utils/exceptions';
import { AddJobCommand } from './add-job.command';
import { CalculateDelayService } from '../../services';
import { InstrumentUsecase } from '../../instrumentation';
import { DetailEnum } from '../create-execution-details';
import {
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '../execution-log-route';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class AddDelayJob {
  private chimeraConnector: any = this.initiateChimeraConnector();

  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService,
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute,
    private moduleRef: ModuleRef
  ) {}

  @InstrumentUsecase()
  public async execute(command: AddJobCommand): Promise<number | undefined> {
    const data = command.job;

    if (!data) throw new ApiException(`Job with id ${command.jobId} not found`);

    const isDelayStep = data.type === StepTypeEnum.DELAY;

    if (!data || !isDelayStep) {
      return undefined;
    }

    let delay;

    try {
      const chimeraResponse = await this.chimeraConnector.execute(command);

      delay = this.calculateDelayService.calculateDelay({
        stepMetadata: data.step.metadata,
        payload: data.payload,
        overrides: data.overrides,
      });

      await this.jobRepository.updateStatus(
        command.environmentId,
        data._id,
        JobStatusEnum.DELAYED
      );
    } catch (error: any) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.DELAY_MISCONFIGURATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: error.message }),
        })
      );

      await this.jobRepository.updateStatus(
        command.environmentId,
        data._id,
        JobStatusEnum.CANCELED
      );

      throw error;
    }

    return delay;
  }
  private initiateChimeraConnector() {
    try {
      if (
        process.env.NOVU_ENTERPRISE === 'true' ||
        process.env.CI_EE_TEST === 'true'
      ) {
        if (!require('@novu/ee-chimera')?.ChimeraConnector) {
          throw new PlatformException('ChimeraConnector module is not loaded');
        }

        return this.moduleRef.get(
          require('@novu/ee-chimera')?.ChimeraConnector,
          {
            strict: false,
          }
        );
      }
    } catch (e) {
      Logger.error(
        e,
        `Unexpected error while importing enterprise modules`,
        'ChimeraConnector'
      );
    }
  }
}
