import { SystemVariablesWithTypes } from '@novu/shared';

export function getSuggestionVariables(schemaObject, namespace: string) {
  return Object.keys(schemaObject)
    .flatMap((name) => {
      const schemaItem = schemaObject[name];
      if (schemaItem?.type === 'object') {
        return getSuggestionVariables(schemaItem.properties, `${namespace}.${name}`);
      }
      if (schemaItem?.type === 'array') {
        // TODO: determine how we should handle dynamic (array-based controls)

        return;
      }

      return `${namespace}.${name}`;
    })
    .filter((variable) => !!variable);
}

export const subscriberVariables = getSuggestionVariables(SystemVariablesWithTypes.subscriber, 'subscriber');
