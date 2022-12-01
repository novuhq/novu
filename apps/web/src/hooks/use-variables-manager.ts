import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import { TemplateVariableTypeEnum } from '@novu/shared';
import { IMustacheVariable } from '../components/templates/VariableManager';

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
        .map((con) => con.split('.').reduce((a, b) => a[b], template))
        .map((con) => (Array.isArray(con) ? con.map((innerCon) => innerCon.content).join(' ') : con))
        .join(' ')
    );
  }

  function getMustacheVariables(bod: any[]): IMustacheVariable[] {
    const stringVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'MustacheStatement')
      .map((body) => ({
        type: TemplateVariableTypeEnum.STRING,
        name: body.path.original as string,
        defaultValue: '',
        required: false,
      }));

    const arrayVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'BlockStatement' && ['each', 'with'].includes(body.path.head))
      .map((body) => {
        const nestedVariablesInBlock = getMustacheVariables(body.program.body).map((mustVar) => {
          return {
            ...mustVar,
            name: `${body.params[0].original}.${mustVar.name}`,
          };
        });

        return [
          {
            type: TemplateVariableTypeEnum.ARRAY,
            name: body.params[0].original as string,
            required: false,
          },
          ...nestedVariablesInBlock,
        ];
      })
      .flat();

    const boolVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'BlockStatement' && ['if'].includes(body.path.head))
      .map((body) => {
        const nestedVariablesInBlock = getMustacheVariables(body.program.body);

        return [
          {
            type: TemplateVariableTypeEnum.BOOLEAN,
            name: body.params[0].original as string,
            defaultValue: true,
            required: false,
          },
          ...nestedVariablesInBlock,
        ];
      })
      .flat();

    return stringVariables.concat(arrayVariables).concat(boolVariables);
  }

  useMemo(() => {
    const variables = getMustacheVariables(ast.body);
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
