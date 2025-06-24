import type { ValueEditorType } from 'react-querybuilder';
import type { EnhancedField } from '@/components/conditions-editor/conditions-editor';
import { isRelativeDateOperator } from './field-type-operators';

export function getValueEditorTypeForField(fieldName: string, operator: string): ValueEditorType {
  if (operator === 'null' || operator === 'notNull') {
    return null;
  }

  // Always return text for all field types this allows both values and variables
  return 'text';
}

export function shouldUseRelativeDateEditor(operator: string): boolean {
  return isRelativeDateOperator(operator);
}

export function getPlaceholderForField(
  fieldName: string,
  operator: string,
  { fieldData }: { fieldData: EnhancedField }
): string {
  const { dataType } = fieldData;

  // Handle between operators with two values
  if (operator === 'between' || operator === 'notBetween') {
    switch (dataType) {
      case 'number':
        return '0, 100';
      case 'date':
      case 'datetime':
        return '2024-01-01T00:00:00Z, 2024-12-31T23:59:59Z';
      default:
        return 'value1, value2';
    }
  }

  if (operator === 'in' || operator === 'notIn') {
    switch (dataType) {
      case 'number':
        return '1, 2, 3';
      case 'boolean':
        return 'true, false';
      case 'date':
      case 'datetime':
        return '2024-01-01T00:00:00Z, 2024-06-01T12:00:00Z';
      default:
        return 'value1, value2, value3';
    }
  }

  // Single value placeholders
  switch (dataType) {
    case 'string':
      return operator === 'contains' || operator === 'doesNotContain' ? 'search text' : 'text value';
    case 'number':
      return '42';
    case 'boolean':
      return 'true';
    case 'date':
    case 'datetime':
      return '2024-01-01T00:00:00Z';
    case 'array':
      return operator === 'contains' ? 'item' : 'item1, item2';
    case 'object':
      return '{"key": "value"}';
    default:
      return 'value';
  }
}

export type HelpTextInfo = {
  title: string;
  description: string;
  examples: string[];
};

export function getHelpTextForField(operator: string, { fieldData }: { fieldData: EnhancedField }): HelpTextInfo {
  const { dataType } = fieldData;

  // Handle between operators
  if (operator === 'between' || operator === 'notBetween') {
    const action = operator === 'between' ? 'between' : 'not between';

    switch (dataType) {
      case 'number':
        return {
          title: `Number ${action}`,
          description: `Check if the number is ${action} two values (inclusive). Uses two separate input fields. You can also use dynamic values from the payload.`,
          examples: ['First: 10, Second: 50', 'Dynamic: {{payload.minPrice}}'],
        };
      case 'date':
      case 'datetime':
        return {
          title: `Date ${action}`,
          description: `Check if the date is ${action} two dates. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Uses two separate input fields. You can also use dynamic values from the payload.`,
          examples: ['First: 2024-01-01T00:00:00Z', 'Dynamic: {{payload.startDate}}'],
        };
      default:
        return {
          title: `Value ${action}`,
          description: `Check if the value is ${action} two values. Uses two separate input fields. You can also use dynamic values from the payload.`,
          examples: ['First: value1, Second: value2', 'Dynamic: {{payload.minValue}}'],
        };
    }
  }

  // Handle relative date operators
  if (operator === 'moreThanXAgo') {
    return {
      title: 'More than X time ago',
      description:
        'Check if the date occurred more than the specified amount of time ago. Uses current time as reference.',
      examples: ['5 days ago', '2 hours ago', '1 week ago'],
    };
  }

  if (operator === 'lessThanXAgo') {
    return {
      title: 'Less than X time ago',
      description:
        'Check if the date occurred less than the specified amount of time ago. Uses current time as reference.',
      examples: ['3 days ago', '30 minutes ago', '6 months ago'],
    };
  }

  if (operator === 'withinLast') {
    return {
      title: 'Within last X time',
      description: 'Check if the date occurred within the last specified amount of time. Excludes future dates.',
      examples: ['within last 7 days', 'within last 24 hours', 'within last 1 year'],
    };
  }

  if (operator === 'notWithinLast') {
    return {
      title: 'Not within last X time',
      description: 'Check if the date did NOT occur within the last specified amount of time.',
      examples: ['not within last 30 days', 'not within last 2 weeks'],
    };
  }

  if (operator === 'exactlyXAgo') {
    return {
      title: 'Exactly X time ago',
      description:
        'Check if the date occurred exactly the specified amount of time ago (with tolerance based on time unit).',
      examples: ['exactly 1 day ago', 'exactly 2 hours ago'],
    };
  }

  // Handle in/notIn operators
  if (operator === 'in' || operator === 'notIn') {
    const action = operator === 'in' ? 'matches any of' : 'does not match any of';

    switch (dataType) {
      case 'number':
        return {
          title: `Number ${action}`,
          description: `Check if the number ${action} the provided values. Separate multiple values with commas. You can also use dynamic values from the payload.`,
          examples: ['1, 2, 3, 4', '{{payload.allowedIds}}'],
        };
      case 'boolean':
        return {
          title: `Boolean ${action}`,
          description: `Check if the boolean ${action} the provided values. Separate multiple values with commas. You can also use dynamic values from the payload.`,
          examples: ['true, false', '{{payload.isActive}}'],
        };
      case 'date':
      case 'datetime':
        return {
          title: `Date ${action}`,
          description: `Check if the date ${action} the provided dates. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Separate multiple dates with commas. You can also use dynamic values from the payload.`,
          examples: ['2024-01-01T00:00:00Z, 2024-06-01T12:00:00Z', '{{payload.eventDate}}'],
        };
      default:
        return {
          title: `Value ${action}`,
          description: `Check if the value ${action} the provided values. Separate multiple values with commas. You can also use dynamic values from the payload.`,
          examples: ['value1, value2, value3', '{{payload.category}}'],
        };
    }
  }

  // Single value operators
  switch (dataType) {
    case 'string':
      switch (operator) {
        case 'contains':
          return {
            title: 'String contains',
            description:
              'Check if the string contains the specified text (case-sensitive). You can also use dynamic values from the payload.',
            examples: ['hello', '{{payload.searchTerm}}'],
          };
        case 'doesNotContain':
          return {
            title: 'String does not contain',
            description:
              'Check if the string does not contain the specified text (case-sensitive). You can also use dynamic values from the payload.',
            examples: ['spam', '{{payload.blockedWord}}'],
          };
        case 'beginsWith':
          return {
            title: 'String begins with',
            description:
              'Check if the string starts with the specified text (case-sensitive). You can also use dynamic values from the payload.',
            examples: ['Hello', '{{payload.prefix}}'],
          };
        case 'endsWith':
          return {
            title: 'String ends with',
            description:
              'Check if the string ends with the specified text (case-sensitive). You can also use dynamic values from the payload.',
            examples: ['.com', '{{payload.domain}}'],
          };
        default:
          return {
            title: 'String comparison',
            description:
              'Compare the string value with the provided text. You can also use dynamic values from the payload.',
            examples: ['Hello World', '{{payload.message}}'],
          };
      }

    case 'number':
      return {
        title: 'Number comparison',
        description: 'Compare the number with the provided value. You can also use dynamic values from the payload.',
        examples: ['42', '{{payload.age}}'],
      };

    case 'boolean':
      return {
        title: 'Boolean comparison',
        description:
          'Compare the boolean value. Use "true" or "false". You can also use dynamic values from the payload.',
        examples: ['true', '{{payload.isActive}}'],
      };

    case 'date':
    case 'datetime':
      return {
        title: 'Date comparison',
        description:
          'Compare dates using ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Time zone is UTC. You can also use dynamic values from the payload.',
        examples: ['2024-01-01T00:00:00Z', '{{payload.eventDate}}'],
      };

    case 'array':
      if (operator === 'contains') {
        return {
          title: 'Array contains',
          description:
            'Check if the array contains the specified item. You can also use dynamic values from the payload.',
          examples: ['item1', '{{payload.requiredTag}}'],
        };
      }

      return {
        title: 'Array comparison',
        description:
          'Compare array values. For multiple items, separate with commas. You can also use dynamic values from the payload.',
        examples: ['item1, item2', '{{payload.tags}}'],
      };

    case 'object':
      return {
        title: 'Object comparison',
        description: 'Compare object values using JSON format. You can also use dynamic values from the payload.',
        examples: ['{"key": "value"}', '{{payload.metadata}}'],
      };

    default:
      return {
        title: 'Value comparison',
        description:
          'Compare the field value with the provided input. You can also use dynamic values from the payload.',
        examples: ['example value', '{{payload.customField}}'],
      };
  }
}
