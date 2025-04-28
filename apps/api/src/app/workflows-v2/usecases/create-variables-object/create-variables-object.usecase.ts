import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { ControlValuesRepository, EnvironmentEntity, OrganizationEntity, UserEntity } from '@novu/dal';
import { ControlValuesLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { FeatureFlagsService, Instrument, InstrumentUsecase } from '@novu/application-generic';

import { collectKeys, keysToObject } from '../../util/utils';
import { buildVariables } from '../../util/build-variables';
import { CreateVariablesObjectCommand } from './create-variables-object.command';
import { MailyAttrsEnum } from '../../../shared/helpers/maily.types';
import { isStringifiedMailyJSONContent } from '../../../shared/helpers/maily-utils';

export type ArrayVariable = {
  path: string;
  iterations: number;
};

export const DEFAULT_ARRAY_ELEMENTS = 5;
/**
 * Extracts all the variables used in the step control values.
 * Then it creates the object representation of those variables.
 */
@Injectable()
export class CreateVariablesObject {
  constructor(
    private readonly controlValuesRepository: ControlValuesRepository,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: CreateVariablesObjectCommand): Promise<Record<string, unknown>> {
    const { userId, environmentId, organizationId } = command;
    const isEnhancedDigestEnabled = await this.featureFlagService.getFlag({
      user: { _id: userId } as UserEntity,
      environment: { _id: environmentId } as EnvironmentEntity,
      organization: { _id: organizationId } as OrganizationEntity,
      key: FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED,
      defaultValue: false,
    });
    const controlValues = await this.getControlValues(command);

    const variables = this.extractAllVariables(controlValues);
    const arrayVariables = this.extractArrayVariables(controlValues);
    const showIfVariables = this.extractMailyAttribute(controlValues, MailyAttrsEnum.SHOW_IF_KEY);

    const variablesObject = keysToObject(variables, arrayVariables, showIfVariables);

    if (isEnhancedDigestEnabled) {
      return this.ensureEventsVariableIsAnArray(variablesObject);
    }

    return variablesObject;
  }

  private ensureEventsVariableIsAnArray(variablesObject: Record<string, unknown>) {
    const stepsObject = (variablesObject.steps as Record<string, unknown>) ?? {};

    Object.keys(stepsObject).forEach((stepId) => {
      const step = stepsObject[stepId] as Record<string, unknown>;
      const hasUsedEventCount = !!step.eventCount;
      const hasUsedEventsLength = !!(
        step.events &&
        typeof step.events === 'object' &&
        !Array.isArray(step.events) &&
        'length' in step.events
      );

      const hasUsedEvents = !!(step.events && typeof step.events === 'string') || Array.isArray(step.events);
      /**
       * Check if events is an object and has a payload property, for example used in the repeat block like this:
       * steps.digest-step.events.payload which is valid variable
       */
      const hasUsedEventsWithPayload = !!(
        step.events &&
        typeof step.events === 'object' &&
        !Array.isArray(step.events) &&
        'payload' in step.events
      );

      if (hasUsedEventCount || hasUsedEventsLength || hasUsedEvents || hasUsedEventsWithPayload) {
        let payload = {};
        if (Array.isArray(step.events)) {
          const hasPayloadInEvents = step.events.every((evt) => {
            return typeof evt === 'object' && 'payload' in evt;
          });
          if (hasPayloadInEvents) {
            payload = step.events[0].payload;
          }
        } else if (hasUsedEventsWithPayload) {
          const variableNameAfterPayload = collectKeys((step.events as Record<string, unknown>).payload);
          for (const variableName of variableNameAfterPayload) {
            const key = variableName.split('.').pop() ?? variableName;

            payload = { ...payload, ...this.setNestedValue(payload, variableName, key) };
          }
        }
        step.events = Array.from({ length: DEFAULT_ARRAY_ELEMENTS }, () => ({ payload }));
      }
    });

    return variablesObject;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: string) {
    const keys = path.split('.');

    const val = keys.reduceRight((acc, key, index) => {
      if (index === keys.length - 1) {
        return { [key]: value };
      } else {
        return { [key]: acc };
      }
    }, {});

    return _.merge(obj, val);
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

  private extractArrayVariables(controlValues: unknown[]): ArrayVariable[] {
    // Extract 'Repeat' block iterable variables ('each' key) together with their set iterations
    const eachKeyVars = this.extractMailyAttribute(controlValues, MailyAttrsEnum.EACH_KEY).map((path) => ({
      path,
      iterations: DEFAULT_ARRAY_ELEMENTS,
    }));

    // Extract iterable variables outside of 'Repeat' blocks, always with 3 iterations
    const idVars = this.extractMailyAttribute(controlValues, MailyAttrsEnum.ID, this.extractArrayPath).map((path) => ({
      path,
      iterations: DEFAULT_ARRAY_ELEMENTS,
    }));

    return [...eachKeyVars, ...idVars];
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
