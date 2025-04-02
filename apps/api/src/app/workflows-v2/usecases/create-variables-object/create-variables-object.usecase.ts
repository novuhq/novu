import { Injectable } from '@nestjs/common';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '@novu/application-generic';

import { keysToObject } from '../../util/utils';
import { buildVariables } from '../../util/build-variables';
import { CreateVariablesObjectCommand } from './create-variables-object.command';
import { isStringifiedMailyJSONContent } from '../../../environments-v1/usecases/output-renderers/maily-to-liquid/wrap-maily-in-liquid.command';
import { MailyAttrsEnum } from '../../../environments-v1/usecases/output-renderers/maily-to-liquid/maily.types';

@Injectable()
export class CreateVariablesObject {
  constructor(private readonly controlValuesRepository: ControlValuesRepository) {}

  @InstrumentUsecase()
  async execute(command: CreateVariablesObjectCommand): Promise<Record<string, unknown>> {
    const controlValues = await this.getControlValues(command);

    const variables = this.extractAllVariables(controlValues);
    const arrayVariables = [
      ...this.extractMailyAttribute(controlValues, MailyAttrsEnum.EACH_KEY),
      ...this.extractMailyAttribute(controlValues, MailyAttrsEnum.ID, this.extractArrayPath),
    ];
    const showIfVariables = this.extractMailyAttribute(controlValues, MailyAttrsEnum.SHOW_IF_KEY);

    return keysToObject(variables, arrayVariables, showIfVariables);
  }

  private async getControlValues(command: CreateVariablesObjectCommand) {
    if (command.controlValues) {
      return [command.controlValues].flat().flatMap((obj) => Object.values(obj));
    }

    if (command.workflowId) {
      const controls = await this.controlValuesRepository.find(
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
      );

      return controls
        .map((item) => item.controls)
        .flat()
        .flatMap((obj) => Object.values(obj));
    }

    return [];
  }

  /**
   * Extracts all variables from control values by parsing handlebars syntax {{variable}}.
   * Removes duplicates from the final result.
   *
   * @example
   * controlValues = [ "John {{name}}", "Address {{address}} {{address}}", "nothing", 123, true ]
   * returns = [ "name", "address" ]
   */
  @Instrument()
  private extractAllVariables(controlValues: unknown[]): string[] {
    const variables = controlValues.flatMap((value) => {
      const templateVariables = buildVariables(undefined, value);

      return templateVariables.validVariables.map((variable) => variable.name);
    });

    return [...new Set(variables)];
  }

  /**
   * Extracts variables from Maily JSON content by looking for attribute patterns.
   * Can optionally transform the extracted values.
   *
   * @example
   * For EACH_KEY: '{"each": "payload.comments"}' returns ["payload.comments"]
   * For ID with array transform: '{"id": "payload.foo[0].bar"}' returns ["payload.foo"]
   * For SHOW_IF_KEY: '{"showIfKey": "payload.isHidden"}' returns ["payload.isHidden"]
   */
  private extractMailyAttribute(
    controlValues: unknown[],
    attributeType: MailyAttrsEnum,
    transform: (value: string) => string | undefined = (value) => value
  ): string[] {
    const variables = new Set<string>();
    const pattern = new RegExp(`"${attributeType}"\\s*:\\s*"([^"]+)"`, 'g');

    controlValues.forEach((value) => {
      if (!isStringifiedMailyJSONContent(value)) return;

      const unescapedString = unescape(value);
      const matches = unescapedString.matchAll(pattern);

      for (const match of matches) {
        const extractedValue = match[1];
        if (extractedValue) {
          const transformed = transform(extractedValue);
          if (transformed) variables.add(transformed);
        }
      }
    });

    return Array.from(variables);
  }

  /**
   * Extracts the base path from an array notation path
   * @example
   * "payload.items[0].bar" returns "payload.items"
   */
  private extractArrayPath(value: string): string | undefined {
    return value.match(/([^[]+)\[\d+\]/)?.[1];
  }
}
