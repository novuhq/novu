import { Injectable } from '@nestjs/common';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '@novu/application-generic';

import { keysToObject } from '../../util/utils';
import { buildVariables } from '../../util/build-variables';
import { ExtractVariablesCommand } from './extract-variables.command';

@Injectable()
export class ExtractVariables {
  constructor(private readonly controlValuesRepository: ControlValuesRepository) {}

  @InstrumentUsecase()
  async execute(command: ExtractVariablesCommand): Promise<Record<string, unknown>> {
    const controlValues = await this.getControlValues(command);
    const extractedVariables = await this.extractAllVariables(controlValues);

    return keysToObject(extractedVariables);
  }

  private async getControlValues(command: ExtractVariablesCommand) {
    let controlValues = command.controlValues ? [command.controlValues] : [];

    if (!controlValues.length && command.workflowId) {
      controlValues = (
        await this.controlValuesRepository.find(
          {
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            _workflowId: command.workflowId,
            level: ControlValuesLevelEnum.STEP_CONTROLS,
            controls: { $ne: null },
          },
          {
            controls: 1,
            _id: 0,
          }
        )
      ).map((item) => item.controls);
    }

    // get just the actual control "values", not entire objects
    return controlValues.flat().flatMap((obj) => Object.values(obj));
  }

  /**
   * @example
   * controlValues = [ "John {{name}}", "Address {{address}} {{address}}", "nothing", 123, true ]
   * returns = [ "name", "address" ]
   */
  @Instrument()
  private async extractAllVariables(controlValues: unknown[]): Promise<string[]> {
    const allVariables: string[] = [];

    for (const controlValue of controlValues) {
      const templateVariables = buildVariables(undefined, controlValue);
      allVariables.push(...templateVariables.validVariables.map((variable) => variable.name));
    }

    return [...new Set(allVariables)];
  }
}
