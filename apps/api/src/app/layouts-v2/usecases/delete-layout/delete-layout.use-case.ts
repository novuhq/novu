import { Injectable, ConflictException } from '@nestjs/common';
import {
  GetLayoutCommand as GetLayoutCommandV1,
  GetLayoutUseCase as GetLayoutUseCaseV1,
  AnalyticsService,
} from '@novu/application-generic';
import { LayoutRepository, ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';

import { DeleteLayoutCommand } from './delete-layout.command';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCaseV1: GetLayoutUseCaseV1,
    private layoutRepository: LayoutRepository,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const layout = await this.getLayoutUseCaseV1.execute(
      GetLayoutCommandV1.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      })
    );

    if (layout.isDefault) {
      throw new ConflictException(
        `Layout with id ${command.layoutIdOrInternalId} is being used as a default layout, it can not be deleted`
      );
    }

    await this.removeLayoutReferencesFromStepControls({
      layoutId: layout._id!,
      environmentId: layout._environmentId,
      organizationId: layout._organizationId,
    });

    await this.layoutRepository.deleteLayout(layout._id!, layout._environmentId, layout._organizationId);

    await this.controlValuesRepository.delete({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _layoutId: layout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    this.analyticsService.track('Delete layout - [Layouts]', command.user._id, {
      _organizationId: command.user.organizationId,
      _environmentId: command.user.environmentId,
      layoutId: layout._id!,
    });
  }

  private async removeLayoutReferencesFromStepControls({
    layoutId,
    environmentId,
    organizationId,
  }: {
    layoutId: string;
    environmentId: string;
    organizationId: string;
  }): Promise<void> {
    const stepControlValues = await this.controlValuesRepository.findMany({
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      _environmentId: environmentId,
      _organizationId: organizationId,
      'controls.layoutId': layoutId,
    });

    for (const controlValue of stepControlValues) {
      await this.controlValuesRepository.updateOne(
        {
          _id: controlValue._id,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        { $unset: { 'controls.layoutId': '' } }
      );
    }
  }
}
