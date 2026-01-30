import { ConflictException, Injectable } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, LayoutRepository, LocalizationResourceEnum } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { DeleteTranslationGroup } from '@novu/translation';
import { LayoutResponseDto } from '../../dtos';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { DeleteLayoutCommand } from './delete-layout.command';

@Injectable()
export class DeleteLayoutUseCase {
  constructor(
    private getLayoutUseCase: GetLayoutUseCase,
    private layoutRepository: LayoutRepository,
    private controlValuesRepository: ControlValuesRepository,
    private analyticsService: AnalyticsService,
    private deleteTranslationGroupUseCase: DeleteTranslationGroup,
    private logger: PinoLogger
  ) {}

  async execute(command: DeleteLayoutCommand): Promise<void> {
    const { environmentId, organizationId, userId } = command;
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
      layoutId: layout.layoutId!,
      environmentId,
      organizationId,
    });

    await this.deleteLayoutTranslationGroup(layout, command);

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
    await this.controlValuesRepository.update(
      {
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        _environmentId: environmentId,
        _organizationId: organizationId,
        'controls.layoutId': layoutId,
      },
      { $unset: { 'controls.layoutId': '' } }
    );
  }

  private async deleteLayoutTranslationGroup(layout: LayoutResponseDto, command: DeleteLayoutCommand) {
    try {
      await this.deleteTranslationGroupUseCase.execute({
        resourceId: layout.layoutId,
        resourceType: LocalizationResourceEnum.LAYOUT,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      });
    } catch (error) {
      this.logger.error(`Failed to delete translations for layout`, {
        layoutId: layout.layoutId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // translation group might not be present, so we can ignore the error
    }
  }
}
