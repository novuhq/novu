import { Injectable, ConflictException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { LayoutRepository, ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';

import { DeleteLayoutCommand } from './delete-layout.command';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const { environmentId, organizationId, _id: userId } = command.user;
    const layout = await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId,
        organizationId,
        userId,
        skipAdditionalFields: true,
      })
    );

    if (layout.isDefault) {
      throw new ConflictException(
        `Layout with id ${command.layoutIdOrInternalId} is being used as a default layout, it can not be deleted`
      );
    }

    await this.removeLayoutReferencesFromStepControls({
      layoutId: layout._id!,
      environmentId,
      organizationId,
    });

    await this.layoutRepository.deleteLayout(layout._id!, environmentId, organizationId);

    await this.controlValuesRepository.delete({
      _environmentId: environmentId,
      _organizationId: organizationId,
      _layoutId: layout._id!,
      level: ControlValuesLevelEnum.LAYOUT_CONTROLS,
    });

    this.analyticsService.track('Delete layout - [Layouts]', userId, {
      _organizationId: organizationId,
      _environmentId: environmentId,
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
