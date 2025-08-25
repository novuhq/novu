import { BadRequestException, Injectable } from '@nestjs/common';
import { Instrument, InstrumentUsecase } from '@novu/application-generic';
import { ResourceOriginEnum } from '@novu/shared';
import { LayoutResponseDto } from '../../dtos';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { UpsertLayout, UpsertLayoutCommand, UpsertLayoutDataCommand } from '../upsert-layout';
import { LayoutSyncToEnvironmentCommand } from './layout-sync-to-environment.command';

export const SYNCABLE_LAYOUT_ORIGINS = [ResourceOriginEnum.NOVU_CLOUD];

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
    private upsertLayoutUseCase: UpsertLayout
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
        preserveLayoutId: true,
        environmentId: command.targetEnvironmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        layoutIdOrInternalId: targetLayout?.layoutId,
        layoutDto,
      })
    );

    return upsertedLayout;
  }

  private isSyncable(layout: LayoutResponseDto): boolean {
    return SYNCABLE_LAYOUT_ORIGINS.includes(layout.origin);
  }

  private async buildRequestDto(sourceLayout: LayoutResponseDto): Promise<UpsertLayoutDataCommand> {
    return {
      layoutId: sourceLayout.layoutId,
      name: sourceLayout.name,
      controlValues: sourceLayout.controls.values,
    };
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
