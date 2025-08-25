import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { COMPARISON_OPERATORS, JsonComparisonOperatorEnum, JsonLogicOperatorEnum } from './types';

type QueryIssue = {
  message: string;
  path: number[];
  type: QueryIssueTypeEnum;
};

export enum QueryIssueTypeEnum {
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  MISSING_VALUE = 'MISSING_VALUE',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
}

export class QueryValidatorService {
  constructor(
    private allowedVariables: string[],
    private allowedNamespaces: string[]
  ) {}

  private isInvalidFieldReference(field: unknown) {
    return !field || typeof field !== 'object' || !('var' in field);
  }

  private isInvalidFieldValue(field: unknown) {
    const fieldValue = (field as { var: string })?.var ?? '';

    // Special case: allow 'subscriber.data' specifically as we want the user to check for null values
    if (fieldValue === 'subscriber.data') {
      return false;
    }

    // Check if field is within allowed namespaces (nested properties only)
    const isWithinAllowedPrefixes = this.allowedNamespaces.some(
      (prefix) => fieldValue.startsWith(prefix) && fieldValue.length > prefix.length
    );

    return !fieldValue || (!this.allowedVariables.includes(fieldValue) && !isWithinAllowedPrefixes);
  }

  private getLogicalOperatorIssue(operator: string, path: number[]): QueryIssue {
    return {
      message: `Invalid logical operator "${operator}" structure`,
      path,
      type: QueryIssueTypeEnum.INVALID_STRUCTURE,
    };
  }

  private getFieldReferenceIssue(path: number[]): QueryIssue {
    return {
      message: 'Invalid field reference in comparison',
      path,
      type: QueryIssueTypeEnum.INVALID_STRUCTURE,
    };
  }

  private getOperationIssue(operator: string, path: number[]): QueryIssue {
    return {
      message: `Invalid operation structure for operator "${operator}"`,
      path,
      type: QueryIssueTypeEnum.INVALID_STRUCTURE,
    };
  }

  private getValueIssue(path: number[]): QueryIssue {
    return {
      message: 'Value is required',
      path,
      type: QueryIssueTypeEnum.MISSING_VALUE,
    };
  }

  private getFieldValueNotValidIssue(path: number[]): QueryIssue {
    return {
      message: 'Value is not valid',
      path,
      type: QueryIssueTypeEnum.INVALID_FIELD_VALUE,
    };
  }

  private validateFieldReference(field: unknown, issues: QueryIssue[], path: number[]) {
    if (this.isInvalidFieldReference(field)) {
      issues.push(this.getFieldReferenceIssue(path));
    } else if (this.isInvalidFieldValue(field)) {
      issues.push(this.getFieldValueNotValidIssue(path));
    }
  }

  private validateNode({
    node,
    issues,
    path = [],
  }: {
    node: RulesLogic<AdditionalOperation>;
    issues: QueryIssue[];
    path?: number[];
  }) {
    if (!node || typeof node !== 'object') {
      issues.push({
        message: 'Invalid node structure',
        path,
        type: QueryIssueTypeEnum.INVALID_STRUCTURE,
      });

      return;
    }

    const entries = Object.entries(node);

    for (const [key, value] of entries) {
      // handle logical operators "and" and "or"
      if ([JsonLogicOperatorEnum.AND, JsonLogicOperatorEnum.OR].includes(key as JsonLogicOperatorEnum)) {
        if (!Array.isArray(value)) {
          issues.push(this.getLogicalOperatorIssue(key, path));
          continue;
        }

        value.forEach((item, index) => {
          this.validateNode({ node: item, issues, path: [...path, index] });
        });
        continue;
      }

      // handle negation '!' operator
      if (key === JsonLogicOperatorEnum.NOT) {
        this.validateNode({ node: value as RulesLogic<AdditionalOperation>, issues, path });
        continue;
      }

      // handle 'in' and 'contains' operators
      if (key === JsonComparisonOperatorEnum.IN) {
        this.validateInOperation({ value, issues, path });
        continue;
      }

      const isBetween =
        key === JsonComparisonOperatorEnum.LESS_THAN_OR_EQUAL && Array.isArray(value) && value.length === 3;
      if (isBetween) {
        this.validateBetweenOperation({ value: value as [unknown, unknown, unknown], issues, path });
        continue;
      }

      // handle the rest of the comparison operators
      if (COMPARISON_OPERATORS.includes(key as JsonComparisonOperatorEnum)) {
        this.validateComparisonOperation({ operator: key as JsonComparisonOperatorEnum, value, issues, path });
        continue;
      }

      // handle field variable
      if (key === 'var') {
        if (!value) {
          issues.push({
            message: 'Field variable is required',
            path,
            type: QueryIssueTypeEnum.MISSING_VALUE,
          });
        }
      }
    }
  }

  private validateBetweenOperation({
    value,
    issues,
    path,
  }: {
    value: [unknown, unknown, unknown];
    issues: QueryIssue[];
    path: number[];
  }) {
    const [lowerBound, field, upperBound] = value;

    this.validateFieldReference(field, issues, path);

    const lowerBoundIsUndefined = lowerBound === undefined || lowerBound === null;
    const upperBoundIsUndefined = upperBound === undefined || upperBound === null;
    if (lowerBoundIsUndefined || upperBoundIsUndefined) {
      issues.push(this.getValueIssue(path));
    }
  }

  private validateComparisonOperation({
    operator,
    value,
    issues,
    path,
  }: {
    operator: JsonComparisonOperatorEnum;
    value: unknown;
    issues: QueryIssue[];
    path: number[];
  }) {
    if (!Array.isArray(value) || value.length !== 2) {
      issues.push(this.getOperationIssue(operator, path));

      return;
    }

    const [field, comparisonValue] = value;

    // Validate field reference
    this.validateFieldReference(field, issues, path);

    // Validate comparison value exists
    const valueIsUndefinedOrEmptyCase =
      (comparisonValue === undefined || comparisonValue === '') &&
      [
        JsonComparisonOperatorEnum.EQUAL,
        JsonComparisonOperatorEnum.NOT_EQUAL,
        JsonComparisonOperatorEnum.LESS_THAN,
        JsonComparisonOperatorEnum.GREATER_THAN,
        JsonComparisonOperatorEnum.LESS_THAN_OR_EQUAL,
        JsonComparisonOperatorEnum.GREATER_THAN_OR_EQUAL,
        JsonComparisonOperatorEnum.STARTS_WITH,
        JsonComparisonOperatorEnum.ENDS_WITH,
      ].includes(operator);
    const valueIsNullCase =
      comparisonValue === null &&
      ![JsonComparisonOperatorEnum.EQUAL, JsonComparisonOperatorEnum.NOT_EQUAL].includes(operator);

    if (valueIsUndefinedOrEmptyCase || valueIsNullCase) {
      issues.push(this.getValueIssue(path));
    }

    // Validate array for 'in' operations
    const invalidComparisonValue = operator === 'in' && !Array.isArray(comparisonValue);
    if (invalidComparisonValue) {
      issues.push(this.getOperationIssue(operator, path));
    }
  }

  /*
   * in operator has field and the array as operands
   * but as contains it has the search value and the field as operands
   */
  private validateInOperation({ value, issues, path }: { value: unknown; issues: QueryIssue[]; path: number[] }) {
    if (!Array.isArray(value) || value.length !== 2) {
      issues.push(this.getOperationIssue('in', path));

      return;
    }

    const [firstOperand, secondOperand] = value;
    const isContains = typeof firstOperand === 'string';

    if (isContains) {
      // Validate search value exists
      const searchValueExists = firstOperand === undefined || firstOperand === '';
      if (searchValueExists) {
        issues.push(this.getValueIssue(path));
      }

      // Validate field reference
      const secondOperandInvalid = !secondOperand || typeof secondOperand !== 'object' || !('var' in secondOperand);
      if (secondOperandInvalid) {
        issues.push(this.getFieldReferenceIssue(path));
      }
    } else {
      // Validate field reference
      const firstOperandInvalid = !firstOperand || typeof firstOperand !== 'object' || !('var' in firstOperand);
      if (firstOperandInvalid) {
        issues.push(this.getFieldReferenceIssue(path));
      }

      // Validate the in array is not empty
      const secondOperandEmpty =
        secondOperand === undefined ||
        secondOperand === null ||
        (Array.isArray(secondOperand) && secondOperand.length === 0);
      if (secondOperandEmpty) {
        issues.push(this.getValueIssue(path));
      }
    }
  }

  public validateQueryRules(node: RulesLogic<AdditionalOperation>): QueryIssue[] {
    const issues: QueryIssue[] = [];

    this.validateNode({ node, issues });

    return issues;
  }
}
