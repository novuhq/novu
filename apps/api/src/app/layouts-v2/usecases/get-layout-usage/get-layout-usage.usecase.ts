import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ControlValuesRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { GetLayoutUsageResponseDto, WorkflowInfoDto } from '../../dtos';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout';
import { GetLayoutUsageCommand } from './get-layout-usage.command';

@Injectable()
export class GetLayoutUsageUseCase {
  constructor(
    private controlValuesRepository: ControlValuesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getLayoutUseCase: GetLayoutUseCase
  ) {}

  @InstrumentUsecase()
  async execute(command: GetLayoutUsageCommand): Promise<GetLayoutUsageResponseDto> {
    // First, resolve the layout to get its internal ID
    const layout = await this.getLayoutUseCase.execute(
      GetLayoutCommand.create({
        layoutIdOrInternalId: command.layoutIdOrInternalId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        skipAdditionalFields: true,
      })
    );

    const workflows: WorkflowInfoDto[] = [];

    // Get control values that reference this layout
    const controlValues = await this.controlValuesRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      'controls.layoutId': layout.layoutId,
    });

    // Get unique workflow IDs from the control values
    const workflowIds = [...new Set(controlValues.map((cv) => cv._workflowId).filter(Boolean))] as string[];

    // Fetch workflow information for each workflow ID
    for (const workflowId of workflowIds) {
      try {
        const workflow = await this.notificationTemplateRepository.findById(workflowId, command.environmentId);

        if (workflow && workflow.triggers && workflow.triggers.length > 0) {
          workflows.push({
            name: workflow.name,
            workflowId: workflow.triggers[0].identifier,
          });
        }
      } catch (error) {}
    }

    return {
      workflows,
    };
  }
}
