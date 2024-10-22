import { PlaceholderMap } from './collect-placeholders-from-tip-tap-schema.usecase';

export class TransformPlaceholderMapCommand {
  input: PlaceholderMap;
}

export class TransformPlaceholderMapUseCase {
  public execute(command: TransformPlaceholderMapCommand): Record<string, any> {
    const defaultPayload: Record<string, any> = {};

    const setNestedValue = (obj: Record<string, any>, path: string, value: any) => {
      const keys = path.split('.');
      let current = obj;

      keys.forEach((key, index) => {
        if (!current.hasOwnProperty(key)) {
          current[key] = index === keys.length - 1 ? value : {};
        }
        current = current[key];
      });
    };

    this.processFor(command.input, setNestedValue, defaultPayload);

    for (const key in command.input.show) {
      if (command.input.show.hasOwnProperty(key)) {
        setNestedValue(defaultPayload, key, 'true');
      }
    }

    for (const key in command.input.regular) {
      if (command.input.regular.hasOwnProperty(key)) {
        setNestedValue(defaultPayload, key, `{{${key}}}`);
      }
    }

    return defaultPayload;
  }

  private processFor(
    input: PlaceholderMap,
    setNestedValue: (obj: Record<string, any>, path: string, value: any) => void,
    defaultPayload: Record<string, any>
  ) {
    for (const key in input.for) {
      if (input.for.hasOwnProperty(key)) {
        const items = input.for[key];
        const finalValue = [{}, {}];
        setNestedValue(defaultPayload, key, finalValue);
        items.forEach((item) => {
          const extractedKey = item.replace('item.', '');
          // TODO: extract to const
          const valueFunc = (suffix) => `{#${item}#}-${suffix}`;
          setNestedValue(finalValue[0], extractedKey, valueFunc('1'));
          setNestedValue(finalValue[1], extractedKey, valueFunc('2'));
        });
      }
    }
  }
}
