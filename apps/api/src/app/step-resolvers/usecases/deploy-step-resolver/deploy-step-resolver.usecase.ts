import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  InstrumentUsecase,
  PinoLogger,
} from '@novu/application-generic';
import { ControlValuesEntity, ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { createHash } from 'crypto';
import { DeployStepResolverResponseDto } from '../../dtos';
import { CloudflareStepResolverDeployService } from '../../services/cloudflare-step-resolver-deploy.service';
import { generateStepResolverWorkerId } from '../../utils/generate-step-resolver-worker-id';
import { DeployStepResolverCommand, DeployStepResolverManifestStepCommand } from './deploy-step-resolver.command';

const MAX_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024;
const STEP_RESOLVER_HASH_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const STEP_RESOLVER_HASH_LENGTH = 10;

interface ResolvedManifestStep {
  workflowId: string;
  workflowInternalId: string;
  stepId: string;
  stepInternalId: string;
  existingControlValues: ControlValuesEntity | null;
}

@Injectable()
export class DeployStepResolverUsecase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private cloudflareStepResolverDeployService: CloudflareStepResolverDeployService,
    private controlValuesRepository: ControlValuesRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: DeployStepResolverCommand): Promise<DeployStepResolverResponseDto> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED,
      defaultValue: false,
      organization: { _id: command.user.organizationId },
    });

    if (!isEnabled) {
      throw new ForbiddenException('Step resolver feature is not enabled for this organization');
    }

    this.assertBundleSize(command.bundleBuffer);

    const resolvedManifestSteps = await this.resolveManifestSteps(command, command.manifestSteps);
    const stepResolverHash = this.generateStepResolverHash(command.bundleBuffer);
    const workerId = generateStepResolverWorkerId(command.user.organizationId, stepResolverHash);

    this.logger.info(
      {
        workerId,
        stepResolverHash,
        selectedStepsCount: resolvedManifestSteps.length,
        bundleSizeBytes: command.bundleBuffer.byteLength,
        userId: command.user._id,
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
      },
      'Deploying step resolver release'
    );

    await this.cloudflareStepResolverDeployService.deploy({
      workerId,
      organizationId: command.user.organizationId,
      stepResolverHash,
      bundleBuffer: command.bundleBuffer,
    });

    await this.upsertControlValues(command, resolvedManifestSteps, stepResolverHash);

    return {
      stepResolverHash,
      workerId,
      selectedStepsCount: resolvedManifestSteps.length,
      deployedAt: new Date().toISOString(),
    };
  }

  private async resolveManifestSteps(
    command: DeployStepResolverCommand,
    manifestSteps: DeployStepResolverManifestStepCommand[]
  ): Promise<ResolvedManifestStep[]> {
    const workflowCache = new Map<string, Awaited<ReturnType<GetWorkflowByIdsUseCase['execute']>>>();

    const partialSteps: Omit<ResolvedManifestStep, 'existingControlValues'>[] = [];

    for (const manifestStep of manifestSteps) {
      let workflow = workflowCache.get(manifestStep.workflowId);
      if (!workflow) {
        workflow = await this.getWorkflowByIdsUseCase.execute(
          GetWorkflowByIdsCommand.create({
            workflowIdOrInternalId: manifestStep.workflowId,
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            userId: command.user._id,
          })
        );
        workflowCache.set(manifestStep.workflowId, workflow);
      }

      const step = workflow.steps.find((workflowStep) => workflowStep.stepId === manifestStep.stepId);
      if (!step || !step._templateId) {
        throw new BadRequestException({
          message: 'Step cannot be found in workflow',
          workflowId: manifestStep.workflowId,
          stepId: manifestStep.stepId,
        });
      }

      partialSteps.push({
        workflowId: manifestStep.workflowId,
        workflowInternalId: String(workflow._id),
        stepId: manifestStep.stepId,
        stepInternalId: String(step._templateId),
      });
    }

    const existingControlValuesResults = await Promise.all(
      partialSteps.map((step) =>
        this.controlValuesRepository.findFirst({
          _environmentId: command.user.environmentId,
          _organizationId: command.user.organizationId,
          _workflowId: step.workflowInternalId,
          _stepId: step.stepInternalId,
          level: ControlValuesLevelEnum.STEP_CONTROLS,
        })
      )
    );

    return partialSteps.map((step, index) => ({
      ...step,
      existingControlValues: existingControlValuesResults[index],
    }));
  }

  private async upsertControlValues(
    command: DeployStepResolverCommand,
    resolvedSteps: ResolvedManifestStep[],
    stepResolverHash: string
  ): Promise<void> {
    await this.controlValuesRepository.withTransaction(async (session) => {
      for (const step of resolvedSteps) {
        const existingControls = this.readControlObject(step.existingControlValues);
        const mergedControls = {
          ...existingControls,
          stepResolverHash,
        };

        if (step.existingControlValues) {
          await this.controlValuesRepository.update(
            {
              _id: step.existingControlValues._id,
              _organizationId: command.user.organizationId,
            },
            {
              priority: 0,
              controls: mergedControls,
            },
            { session }
          );
        } else {
          await this.controlValuesRepository.create(
            {
              _organizationId: command.user.organizationId,
              _environmentId: command.user.environmentId,
              _workflowId: step.workflowInternalId,
              _stepId: step.stepInternalId,
              level: ControlValuesLevelEnum.STEP_CONTROLS,
              priority: 0,
              controls: mergedControls,
            },
            { session }
          );
        }
      }
    });
  }

  private readControlObject(controlValues: ControlValuesEntity | null): Record<string, unknown> {
    if (!controlValues || !isPlainObject(controlValues.controls)) {
      return {};
    }

    return controlValues.controls;
  }

  private generateStepResolverHash(bundleBuffer: Buffer): string {
    const digest = createHash('sha256').update(bundleBuffer).digest();
    const readableToken = this.encodeBase32(digest).slice(0, STEP_RESOLVER_HASH_LENGTH);

    return `${readableToken.slice(0, 5)}-${readableToken.slice(5, 10)}`;
  }

  private encodeBase32(bytes: Uint8Array): string {
    let output = '';
    let bitBuffer = 0;
    let bitCount = 0;

    for (const byte of bytes) {
      bitBuffer = (bitBuffer << 8) | byte;
      bitCount += 8;

      while (bitCount >= 5) {
        bitCount -= 5;
        output += STEP_RESOLVER_HASH_ALPHABET[(bitBuffer >> bitCount) & 0x1f];
      }
    }

    if (bitCount > 0) {
      output += STEP_RESOLVER_HASH_ALPHABET[(bitBuffer << (5 - bitCount)) & 0x1f];
    }

    return output;
  }

  private assertBundleSize(bundleBuffer: Buffer): void {
    if (bundleBuffer.byteLength <= MAX_BUNDLE_SIZE_BYTES) {
      return;
    }

    throw new BadRequestException(
      `Bundle too large (${(bundleBuffer.byteLength / 1024 / 1024).toFixed(2)} MB). Maximum allowed size is ${
        MAX_BUNDLE_SIZE_BYTES / 1024 / 1024
      } MB.`
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
