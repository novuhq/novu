import { GeneratePreviewRequestDto, TipTapNode } from '@novu/shared';
import { TransformPlaceholderMapUseCase } from './transform-placeholder-usecase-use-case';
import {
  CollectPlaceholdersFromTipTapSchemaUseCase,
  extractPlaceholders,
} from './collect-placeholders-from-tip-tap-schema-use-case';

// Command interface with the same name as the class but without the "UseCase" suffix
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface AddKeysToPayloadBasedOnHydrationStrategyCommand {
  dto: GeneratePreviewRequestDto;
  controlValueKey: string;
}

// UseCase class with the "UseCase" suffix
export class CreateMockPayloadUseCase {
  public execute(command: AddKeysToPayloadBasedOnHydrationStrategyCommand): Record<string, unknown> {
    const { dto, controlValueKey } = command;

    if (!dto.controlValues) {
      return {};
    }

    const controlValue = dto.controlValues[controlValueKey];
    if (typeof controlValue === 'object') {
      return this.buildPayloadForEmailEditor(controlValue);
    }

    return this.buildPayloadForRegularText(controlValue);
  }

  private buildPayloadForEmailEditor(controlValue: unknown): Record<string, unknown> {
    const collectPlaceholderMappings = new CollectPlaceholdersFromTipTapSchemaUseCase().execute({
      node: controlValue as TipTapNode,
    });
    const transformPlaceholderMap = new TransformPlaceholderMapUseCase().execute({ input: collectPlaceholderMappings });

    return transformPlaceholderMap.payload;
  }

  private buildPayloadForRegularText(controlValue: unknown) {
    const strings = extractPlaceholders(controlValue as string).filter(
      (placeholder) => !placeholder.startsWith('subscriber') && !placeholder.startsWith('actor')
    );

    return new TransformPlaceholderMapUseCase().execute({
      input: { regular: convertToRecord(strings) },
    });
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
