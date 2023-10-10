import { useLayoutEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import isEqual from 'lodash.isequal';
import { getTemplateVariables } from '@novu/shared';

import { IForm, ITemplates } from '../pages/templates/components/formTypes';
import { useStepFormPath } from '../pages/templates/hooks/useStepFormPath';
import { useStepIndex } from '../pages/templates/hooks/useStepIndex';

const getTextContent = ({ templateToParse, fields }: { templateToParse?: ITemplates; fields: string[] }): string => {
  return fields
    .map((con) => con.split('.').reduce((a, b) => a && a[b], templateToParse ?? {}))
    .map((con) => (Array.isArray(con) ? con.map((innerCon) => `${innerCon.content} ${innerCon?.url}`).join(' ') : con))
    .join(' ');
};

export const useVariablesManager = (contents: string[]) => {
  const { stepIndex, variantIndex } = useStepIndex();
  const { watch, control, getValues } = useFormContext<IForm>();
  const stepFormPath = useStepFormPath();
  const variablesArray = useFieldArray({ control, name: `${stepFormPath}.template.variables` });
  const variableArray = watch(`${stepFormPath}.template.variables`);

  const [textContent, setTextContent] = useState<string>(() =>
    getTextContent({ templateToParse: getValues(`${stepFormPath}.template`), fields: contents })
  );

  useLayoutEffect(() => {
    const subscription = watch((values) => {
      const steps = values.steps ?? [];
      if (!steps.length || !steps[stepIndex]) return;

      const step = steps[stepIndex];
      let template = step?.template;
      if (step && typeof variantIndex !== 'undefined' && variantIndex > -1) {
        template = step.variants?.[variantIndex]?.template;
      }

      setTextContent(getTextContent({ templateToParse: template as ITemplates, fields: contents }));
    });

    return () => subscription.unsubscribe();
  }, [stepIndex, variantIndex, watch, setTextContent, contents]);

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
