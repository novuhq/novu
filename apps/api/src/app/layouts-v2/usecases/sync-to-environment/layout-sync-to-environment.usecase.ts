import { BadRequestException, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  GetLayoutCommand,
  GetLayoutUseCase,
  Instrument,
  InstrumentUsecase,
  LayoutResponseDto,
} from '@novu/application-generic';
import { LocalizationResourceEnum } from '@novu/dal';
import { ResourceOriginEnum } from '@novu/shared';
import { UpsertLayout, UpsertLayoutCommand, UpsertLayoutDataCommand } from '../upsert-layout';
import { LayoutSyncToEnvironmentCommand } from './layout-sync-to-environment.command';

const SYNCABLE_LAYOUT_ORIGINS = [ResourceOriginEnum.NOVU_CLOUD];

class LayoutNotSyncableException extends BadRequestException {
  constructor(layout: Pick<LayoutResponseDto, 'layoutId' | 'origin'>) {
    const reason = `origin '${layout.origin}' is not allowed (must be one of: ${SYNCABLE_LAYOUT_ORIGINS.join(', ')})`;

    super({
      message: `Cannot sync layout: ${reason}`,
      layoutId: layout.layoutId,
      origin: layout.origin,
      allowedOrigins: SYNCABLE_LAYOUT_ORIGINS,
    });
  }
}

@Injectable()
export class LayoutSyncToEnvironmentUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private upsertLayoutUseCase: UpsertLayout,
    private moduleRef: ModuleRef
  ) {}

  @InstrumentUsecase()
  async execute(command: LayoutSyncToEnvironmentCommand): Promise<LayoutResponseDto> {
    if (command.user.environmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Cannot sync layout to the same environment');
    }

    const sourceLayout = await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        layoutIdOrInternalId: command.layoutIdOrInternalId,
      })
    );

    if (!this.isSyncable(sourceLayout)) {
      throw new LayoutNotSyncableException(sourceLayout);
    }

    const externalId = sourceLayout.layoutId;
    const targetLayout = await this.findLayoutInTargetEnvironment(command, externalId);

    const layoutDto = await this.buildRequestDto(sourceLayout);

    const upsertedLayout = await this.upsertLayoutUseCase.execute(
      UpsertLayoutCommand.create({
        environmentId: command.targetEnvironmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        layoutIdOrInternalId: targetLayout?.layoutId,
        layoutDto,
      })
    );

    await this.publishTranslationGroup(sourceLayout.layoutId, LocalizationResourceEnum.LAYOUT, command);

    return upsertedLayout;
  }

  private isSyncable(layout: LayoutResponseDto): boolean {
    return SYNCABLE_LAYOUT_ORIGINS.includes(layout.origin);
  }

  private async buildRequestDto(sourceLayout: LayoutResponseDto): Promise<UpsertLayoutDataCommand> {
    return {
      layoutId: sourceLayout.layoutId,
      name: sourceLayout.name,
      isTranslationEnabled: sourceLayout.isTranslationEnabled,
      controlValues: sourceLayout.controls?.values,
    };
  }

  private async publishTranslationGroup(
    resourceId: string,
    resourceType: LocalizationResourceEnum,
    command: LayoutSyncToEnvironmentCommand
  ): Promise<void> {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    const publishTranslationGroup = this.moduleRef.get(require('@novu/ee-translation')?.PublishTranslationGroup, {
      strict: false,
    });

    const { user, targetEnvironmentId } = command;

    await publishTranslationGroup.execute({
      user,
      resourceId,
      resourceType,
      sourceEnvironmentId: user.environmentId,
      targetEnvironmentId,
    });
  }

  @Instrument()
  private async findLayoutInTargetEnvironment(
    command: LayoutSyncToEnvironmentCommand,
    externalId: string
  ): Promise<LayoutResponseDto | undefined> {
    try {
      return await this.getLayoutUseCase.execute(
        GetLayoutCommand.create({
          environmentId: command.targetEnvironmentId,
          organizationId: command.user.organizationId,
          layoutIdOrInternalId: externalId,
        })
      );
    } catch (error) {
      return undefined;
    }
  }
}
