import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import { getTemplateVariables } from '@novu/shared';

export const useVariablesManager = (index: number, contents: string[]) => {
  const [ast, setAst] = useState<any>({ body: [] });
  const [textContent, setTextContent] = useState<string>('');
  const { watch, control, getValues } = useFormContext();

  const variablesArray = useFieldArray({ control, name: `steps.${index}.template.variables` });
  const variableArray = watch(`steps.${index}.template.variables`, []);

  useEffect(() => {
    const subscription = watch((values) => {
      gatherTextContent(values.steps[index].template);
    });

    return () => subscription.unsubscribe();
  }, [watch, contents]);

  useEffect(() => {
    const template = getValues(`steps.${index}.template`);
    gatherTextContent(template);
  }, [contents]);

  useMemo(() => {
    try {
      setAst(parse(textContent));
    } catch (e) {
      return;
    }
  }, [textContent]);

  function gatherTextContent(template = {}) {
    setTextContent(
      contents
        .map((con) => con.split('.').reduce((a, b) => a && a[b], template))
        .map((con) => (Array.isArray(con) ? con.map((innerCon) => innerCon.content).join(' ') : con))
        .join(' ')
    );
  }

  useMemo(() => {
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

    variablesArray.replace(arrayFields.filter((field) => !!field));
  }, [ast]);

  return variablesArray;
};
