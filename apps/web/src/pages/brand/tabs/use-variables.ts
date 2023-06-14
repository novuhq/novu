import { useCallback, useLayoutEffect, useState } from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import isEqual from 'lodash.isequal';
import { getTemplateVariables, ITemplateVariable } from '@novu/shared';
import { ITemplates } from '../../templates/components/formTypes';

// import type { IForm, ITemplates } from '../components/templates/formTypes';
interface ILayoutForm {
  content: string;
  name: string;
  description: string;
  isDefault: boolean;
  variables: ITemplateVariable[];
}
export const useVariablesManager = (index: number, contents: string[]) => {
  const { watch, control, getValues } = useForm<ILayoutForm>();
  const variablesArray = useFieldArray({ control, name: `variables` });
  const variableArray = watch(`variables`, []);

  const getTextContent = useCallback((templateToParse?: any): string => {
    return contents
      .map((con) => con.split('.').reduce((a, b) => a && a[b], templateToParse ?? {}))
      .map((con) => (Array.isArray(con) ? con.map((innerCon) => innerCon.content).join(' ') : con))
      .join(' ');
  }, []);

  const [textContent, setTextContent] = useState<string>(() => getTextContent(getValues(`content`)));

  useLayoutEffect(() => {
    const subscription = watch((values) => {
      const steps = values.content ?? '';
      if (!steps.length) return;

      // const step = steps[index];
      setTextContent(getTextContent(steps));
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
  }, [textContent, variableArray]);

  return variablesArray;
};
