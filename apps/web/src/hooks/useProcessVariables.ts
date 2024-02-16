import { TemplateVariableTypeEnum, IMustacheVariable, ITemplateVariable } from '@novu/shared';
import { useEffect, useState } from 'react';
import * as set from 'lodash.set';
import * as get from 'lodash.get';

const processVariables = (variables: IMustacheVariable[]) => {
  const varsObj: Record<string, any> = {};

  variables
    .filter((variable) => variable.type !== TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, getVariableValue(variable));
    });

  variables
    .filter((variable) => variable.type === TemplateVariableTypeEnum.ARRAY)
    .forEach((variable) => {
      set(varsObj, variable.name, [get(varsObj, variable.name, [])]);
    });

  return JSON.stringify(varsObj, null, 2);
};

const getVariableValue = (variable: IMustacheVariable) => {
  if (variable.type === TemplateVariableTypeEnum.BOOLEAN) {
    return variable.defaultValue;
  }
  if (variable.type === TemplateVariableTypeEnum.STRING) {
    return variable.defaultValue ? variable.defaultValue : variable.name;
  }

  if (variable.type === TemplateVariableTypeEnum.ARRAY) {
    return [];
  }

  return '';
};

export const useProcessVariables = (variables: ITemplateVariable[] | undefined = [], asString = true) => {
  const [processedVariables, setProcessedVariables] = useState(JSON.stringify({}, null, 2));

  useEffect(() => {
    let processed = processVariables(variables);

    if (!asString) {
      processed = JSON.parse(processed);
    }

    setProcessedVariables(processed);
  }, [variables, setProcessedVariables, asString]);

  return processedVariables;
};
