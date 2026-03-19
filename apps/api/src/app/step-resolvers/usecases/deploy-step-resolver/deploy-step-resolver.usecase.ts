import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  BuildStepIssuesUsecase,
  FeatureFlagsService,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  getStepResolverControlSchema,
  InstrumentUsecase,
  PinoLogger,
  reconcileStepResolverControlValues,
} from '@novu/application-generic';
import {
  ClientSession,
  ControlValuesEntity,
  ControlValuesRepository,
  MessageTemplateRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { ControlValuesLevelEnum, FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { createHash } from 'crypto';
import { DeployStepResolverResponseDto } from '../../dtos';
import { CloudflareStepResolverDeployService } from '../../services/cloudflare-step-resolver-deploy.service';
import { generateStepResolverWorkerId } from '../../utils/generate-step-resolver-worker-id';
import { DeployStepResolverCommand, DeployStepResolverManifestStepCommand } from './deploy-step-resolver.command';

const MAX_BUNDLE_SIZE_BYTES = 10 * 1024 * 1024;
// cspell:disable-next-line
const STEP_RESOLVER_HASH_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const STEP_RESOLVER_HASH_LENGTH = 10;

const SUPPORTED_STEP_RESOLVER_TYPES = new Set<StepTypeEnum>([
  StepTypeEnum.EMAIL,
  StepTypeEnum.SMS,
  StepTypeEnum.CHAT,
  StepTypeEnum.PUSH,
  StepTypeEnum.IN_APP,
]);

interface ResolvedManifestStep {
  workflowId: string;
  workflowInternalId: string;
  stepId: string;
  stepInternalId: string;
  stepType: StepTypeEnum;
  controlSchema: Record<string, unknown>;
  existingStepResolverHash: string | undefined;
  existingControlValues: ControlValuesEntity | null;
}

@Injectable()
export class DeployStepResolverUsecase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private cloudflareStepResolverDeployService: CloudflareStepResolverDeployService,
    private controlValuesRepository: ControlValuesRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
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

    await this.controlValuesRepository.withTransaction(async (session) => {
      await this.writeHashToMessageTemplates(command, resolvedManifestSteps, stepResolverHash, session);
      await this.upsertControlValues(command, resolvedManifestSteps, session);
      await this.updateStepControlSchemas(command, resolvedManifestSteps, session);
    });

    await this.recalculateAndPersistStepIssues(command, resolvedManifestSteps);

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

      const actualStepType = step.template?.type;

      if (!actualStepType || !SUPPORTED_STEP_RESOLVER_TYPES.has(actualStepType)) {
        throw new BadRequestException({
          message: `Step type '${actualStepType ?? 'unknown'}' is not supported for step resolvers`,
          workflowId: manifestStep.workflowId,
          stepId: manifestStep.stepId,
        });
      }

      if (actualStepType !== manifestStep.stepType) {
        throw new BadRequestException({
          message: `Manifest stepType '${manifestStep.stepType}' does not match the actual step type '${actualStepType}'`,
          workflowId: manifestStep.workflowId,
          stepId: manifestStep.stepId,
        });
      }

      partialSteps.push({
        workflowId: manifestStep.workflowId,
        workflowInternalId: String(workflow._id),
        stepId: manifestStep.stepId,
        stepInternalId: String(step._templateId),
        stepType: actualStepType,
        controlSchema: getStepResolverControlSchema(manifestStep.controlSchema),
        existingStepResolverHash: step.template?.stepResolverHash ?? undefined,
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

  private async writeHashToMessageTemplates(
    command: DeployStepResolverCommand,
    resolvedSteps: ResolvedManifestStep[],
    stepResolverHash: string,
    session: ClientSession | null
  ): Promise<void> {
    for (const step of resolvedSteps) {
      // transactions can't be called in Promise.all, so we need to call it sequentially
      await this.messageTemplateRepository.update(
        { _id: step.stepInternalId, _environmentId: command.user.environmentId },
        { $set: { stepResolverHash } },
        { session }
      );
    }
  }

  private async upsertControlValues(
    command: DeployStepResolverCommand,
    resolvedSteps: ResolvedManifestStep[],
    session: ClientSession | null
  ): Promise<void> {
    for (const step of resolvedSteps) {
      const mergedControls = reconcileStepResolverControlValues(
        this.readControlObject(step.existingControlValues),
        step.controlSchema
      );

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
  }

  private async updateStepControlSchemas(
    command: DeployStepResolverCommand,
    resolvedSteps: ResolvedManifestStep[],
    session: ClientSession | null
  ): Promise<void> {
    for (const step of resolvedSteps) {
      await this.messageTemplateRepository.update(
        { _id: step.stepInternalId, _environmentId: command.user.environmentId },
        { $set: { 'controls.schema': step.controlSchema }, $unset: { 'controls.uiSchema': 1 } },
        { session }
      );
    }
  }

  private async recalculateAndPersistStepIssues(
    command: DeployStepResolverCommand,
    resolvedSteps: ResolvedManifestStep[]
  ): Promise<void> {
    const workflowInternalIds = [...new Set(resolvedSteps.map((s) => s.workflowInternalId))];

    for (const workflowInternalId of workflowInternalIds) {
      const workflow = await this.getWorkflowByIdsUseCase.execute(
        GetWorkflowByIdsCommand.create({
          workflowIdOrInternalId: workflowInternalId,
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
          userId: command.user._id,
        })
      );

      for (const step of resolvedSteps.filter((s) => s.workflowInternalId === workflowInternalId)) {
        const workflowStep = workflow.steps.find((s) => s._templateId === step.stepInternalId);
        if (!workflowStep?._templateId || !workflowStep.template?.type || !workflow.origin) continue;

        const issues = await this.buildStepIssuesUsecase.execute({
          workflowOrigin: workflow.origin,
          user: command.user,
          stepInternalId: workflowStep._templateId,
          workflow,
          controlSchema: workflowStep.template.controls?.schema ?? step.controlSchema,
          stepType: workflowStep.template.type,
        });

        await this.notificationTemplateRepository.update(
          {
            _id: workflowInternalId,
            _environmentId: command.user.environmentId,
            'steps._templateId': step.stepInternalId,
          },
          { $set: { 'steps.$.issues': issues } }
        );
      }
    }
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
