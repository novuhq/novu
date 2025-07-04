import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { FeatureFlagsService, Instrument, InstrumentUsecase } from '@novu/application-generic';

import { collectKeys, keysToObject } from '../../../workflows-v2/util/utils';
import { buildVariables } from '../../../workflows-v2/util/build-variables';
import { CreateVariablesObjectCommand } from './create-variables-object.command';
import { MailyAttrsEnum } from '../../helpers/maily.types';
import { isStringifiedMailyJSONContent } from '../../helpers/maily-utils';
import { JsonSchemaMock } from '../../../workflows-v2/util/json-schema-mock';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';

export type ArrayVariable = {
  path: string;
  iterations: number;
};

export const DEFAULT_ARRAY_ELEMENTS = 3;
/**
 * Creates the object representation of variables from the values.
 */
@Injectable()
export class CreateVariablesObject {
  constructor(private readonly featureFlagService: FeatureFlagsService) {}

  @InstrumentUsecase()
  async execute(command: CreateVariablesObjectCommand): Promise<Record<string, unknown>> {
    const isHtmlEditorEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
      defaultValue: false,
    });

    const variables = this.extractAllVariables({
      controlValues: command.controlValues,
      isHtmlEditorEnabled,
      variableSchema: command.variableSchema,
    });
    const arrayVariables = this.extractArrayVariables(command.controlValues);
    const showIfVariables = this.extractMailyAttribute(command.controlValues, MailyAttrsEnum.SHOW_IF_KEY);

    const variablesObject = keysToObject(variables, arrayVariables, showIfVariables);

    return await this.ensureEventsVariableIsAnArray(variablesObject, command);
  }

  private async ensureEventsVariableIsAnArray(
    variablesObject: Record<string, unknown>,
    command: CreateVariablesObjectCommand
  ) {
    const stepsObject = (variablesObject.steps as Record<string, unknown>) ?? {};

    // Check if we have steps with events and a payload schema to work with
    const hasStepsWithEvents = Object.keys(stepsObject).length > 0;
    const hasPayloadSchema = !!command.payloadSchema;

    let isPayloadSchemaEnabled = false;

    // Only check feature flag if we have both steps and payload schema
    if (hasStepsWithEvents && hasPayloadSchema) {
      isPayloadSchemaEnabled = await this.featureFlagService.getFlag({
        key: FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
        environment: { _id: command.environmentId },
      });
    }

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

        // Use JsonSchemaMock if payload schema is available and feature flag is enabled
        if (isPayloadSchemaEnabled && command.payloadSchema) {
          try {
            const schema = {
              type: 'object' as const,
              properties: { payload: command.payloadSchema },
              additionalProperties: false,
            };
            const mockData = JsonSchemaMock.generate(schema) as Record<string, unknown>;
            payload = mockData.payload as Record<string, unknown>;
          } catch (error) {
            payload = this.generateFallbackPayload(step, hasUsedEventsWithPayload);
          }
        } else {
          // Original fallback method when no payload schema or feature flag is disabled
          payload = this.generateFallbackPayload(step, hasUsedEventsWithPayload);
        }

        step.events = Array.from({ length: DEFAULT_ARRAY_ELEMENTS }, (unused, index) => {
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() - 1);
          eventDate.setHours(12, 0, 0, 0);
          eventDate.setMinutes(eventDate.getMinutes() + index); // Slightly different times for each event

          return {
            id: `example-id-${index + 1}`,
            time: eventDate.toISOString(),
            payload,
          };
        });
      }
    });

    return variablesObject;
  }

  private generateFallbackPayload(
    step: Record<string, unknown>,
    hasUsedEventsWithPayload: boolean
  ): Record<string, unknown> {
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

    return payload;
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

  /**
   * Extracts all variables from control values by parsing handlebars syntax {{variable}}.
   * Removes duplicates from the final result.
   *
   * @example
   * values = [ "John {{name}}", "Address {{address}} {{address}}", "nothing", 123, true ]
   * returns = [ "name", "address" ]
   */
  @Instrument()
  private extractAllVariables({
    controlValues,
    isHtmlEditorEnabled,
    variableSchema,
  }: {
    controlValues: unknown[];
    isHtmlEditorEnabled: boolean;
    variableSchema?: JSONSchemaDto;
  }): string[] {
    const variables = controlValues.flatMap((value) => {
      const templateVariables = buildVariables({
        useNewLiquidParser: isHtmlEditorEnabled,
        variableSchema,
        controlValue: value,
      });

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
