import { Injectable } from '@nestjs/common';
import { TransformPlaceholderMapUseCase } from './transform-placeholder.usecase';
import {
  CollectPlaceholdersFromTipTapSchemaUsecase,
  extractPlaceholders,
} from './collect-placeholders-from-tip-tap-schema.usecase';
import { AddKeysToPayloadBasedOnHydrationStrategyCommand } from './add-keys-to-payload-based-on-hydration-strategy-command';

@Injectable()
export class CreateMockPayloadUseCase {
  constructor(
    private readonly collectPlaceholdersFromTipTapSchemaUsecase: CollectPlaceholdersFromTipTapSchemaUsecase,
    private readonly transformPlaceholderMapUseCase: TransformPlaceholderMapUseCase
  ) {}

  public execute(command: AddKeysToPayloadBasedOnHydrationStrategyCommand): Record<string, unknown> {
    const { controlValues, controlValueKey } = command;

    if (!controlValues) {
      return {};
    }

    const controlValue = controlValues[controlValueKey];

    return this.buildPayloadForRegularText(controlValue);
  }
  private safeJsonParse(jsonString: string): object | undefined {
    try {
      // Attempt to parse the JSON string
      return JSON.parse(jsonString);
    } catch {
      // Return undefined if parsing fails
      return undefined;
    }
  }

  private buildPayloadForRegularText(controlValue: unknown) {
    const strings = extractPlaceholders(controlValue as string).filter(
      (placeholder) => !placeholder.startsWith('subscriber') && !placeholder.startsWith('actor')
    );

    return this.transformPlaceholderMapUseCase.execute({
      input: { regular: convertToRecord(strings) },
    }).payload;
  }
}

function convertToRecord(keys: string[]): Record<string, any> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = ''; // You can set the value to any default value you want

      return acc;
    },
    {} as Record<string, any>
  );
}
