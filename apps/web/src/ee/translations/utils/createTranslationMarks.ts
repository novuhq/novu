import { parseWithoutProcessing } from '@handlebars/parser';
import { MustacheStatement, PathExpression, StringLiteral } from '@handlebars/parser/types/ast';
import { editor as NEditor, Range } from 'monaco-editor';

export const createTranslationMarks = (
  newValue: string | undefined,
  variables: any
): NEditor.IModelDeltaDecoration[] => {
  if (!variables.translations) {
    return [];
  }

  const decorators: NEditor.IModelDeltaDecoration[] = [];

  try {
    const result = parseWithoutProcessing(newValue || '');

    for (let index = 0; index < result.body.length; index += 1) {
      const line = result.body[index];
      if (line.type !== 'MustacheStatement') {
        continue;
      }
      const statement: MustacheStatement = line as MustacheStatement;

      if ((statement.path as PathExpression).head !== 'i18n') {
        continue;
      }

      const badParam = statement.params.find((param) => {
        if (param.type !== 'PathExpression' && param.type !== 'StringLiteral') {
          return false;
        }

        const pathExpression = param as PathExpression | StringLiteral;
        const variable = pathExpression.original;
        const keys = variable.split('.');
        let context = variables.translations;

        for (const key of keys) {
          if (!context[key]) {
            return true;
          }
          context = context[key];
        }
        if (context) {
          return false;
        }

        return true;
      });

      if (!badParam) {
        continue;
      }

      const range = new Range(
        statement.loc.start.line,
        statement.loc.start.column + 1,
        statement.loc.end.line,
        statement.loc.end.column + 1
      );

      decorators.push({
        range,
        options: {
          className: 'markerWiggledLine',
          glyphMarginClassName: 'markerGlyphWarning',
          glyphMarginHoverMessage: [
            {
              value:
                'The variable has no keys for any language. Specify keys for the variable in the translations page',
            },
          ],
        },
      });
      decorators.push({
        range,
        options: {
          inlineClassName: 'markerWarningText',
        },
      });
    }
  } catch (e) {
    /* empty */
  }

  return decorators;
};
