import { useCallback, useLayoutEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import isEqual from 'lodash.isequal';
import { getTemplateVariables } from '@novu/shared';
import { IForm, ITemplates } from '../pages/templates/components/formTypes';

export const useVariablesManager = (index: number, contents: string[]) => {
  const { watch, control, getValues } = useFormContext<IForm>();
  const variablesArray = useFieldArray({ control, name: `steps.${index}.template.variables` });
  const variableArray = watch(`steps.${index}.template.variables`);

  const getTextContent = useCallback(
    ({ templateToParse, fields }: { templateToParse?: ITemplates; fields: string[] }): string => {
      return fields
        .map((con) => con.split('.').reduce((a, b) => a && a[b], templateToParse ?? {}))
        .map((con) => (Array.isArray(con) ? con.map((innerCon) => innerCon.content).join(' ') : con))
        .join(' ');
    },
    []
  );

  const [textContent, setTextContent] = useState<string>(() =>
    getTextContent({ templateToParse: getValues(`steps.${index}.template`), fields: contents })
  );

  useLayoutEffect(() => {
    const subscription = watch((values) => {
      const steps = values.steps ?? [];
      if (!steps.length || !steps[index]) return;

      const step = steps[index];
      setTextContent(getTextContent({ templateToParse: step?.template as ITemplates, fields: contents }));
    });

    return () => subscription.unsubscribe();
  }, [index, watch, setTextContent, getTextContent, contents]);

  useLayoutEffect(() => {
    try {
      const ast = parse(textContent);
      const variables = getTemplateVariables(ast.body);
      const arrayFields = [...(variableArray || [])];

      variables.forEach((vari) => {
        if (!arrayFields.find((field) => field.name === vari.name)) {
          arrayFields.push(vari);
        }
      });

      arrayFields.forEach((vari, ind) => {
        if (!variables.find((field) => field.name === vari.name)) {
          delete arrayFields[ind];
        }
      });

      const newVariablesArray = arrayFields.filter((field) => !!field);

      if (!isEqual(variableArray, newVariablesArray)) {
        variablesArray.replace(newVariablesArray);
      }
    } catch (e) {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textContent, variableArray]);

  return variablesArray;
};
