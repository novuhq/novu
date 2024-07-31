import { SystemVariablesWithTypes } from '@novu/shared';

export function getSuggestionVariables(schemaObject, namespace: string) {
  return Object.keys(schemaObject).flatMap((name) => {
    const schemaItem = schemaObject[name];
    if (schemaItem?.type === 'object') {
      return getSuggestionVariables(schemaItem.properties, `${namespace}.${name}`);
    }

    return `${namespace}.${name}`;
  });
}

export const subscriberVariables = getSuggestionVariables(SystemVariablesWithTypes.subscriber, 'subscriber');
