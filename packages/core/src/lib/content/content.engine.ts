import * as Handlebars from 'handlebars';
import { IAttachmentOptions } from '../..';

Handlebars.registerHelper(
  'equals',
  function (this: typeof Handlebars, arg1, arg2, options) {
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  }
);

type HandlebarsContext = {
  [key: string]:
    | string
    | { key: string }[]
    | { key: string | number }
    | string[]
    | number[]
    | boolean
    | number
    | undefined
    | IAttachmentOptions
    | IAttachmentOptions[];
};

export function compileTemplate(content: string, data: HandlebarsContext) {
  const template = Handlebars.compile<HandlebarsContext>(content);

  return template(data);
}

export function getHandlebarsVariables(input: string): string[] {
  const ast: hbs.AST.Program = Handlebars.parseWithoutProcessing(input);

  return ast.body
    .filter(({ type }: hbs.AST.Statement) => type === 'MustacheStatement')
    .map((statement: hbs.AST.Statement) => {
      const moustacheStatement: hbs.AST.MustacheStatement =
        statement as hbs.AST.MustacheStatement;
      const paramsExpressionList =
        moustacheStatement.params as hbs.AST.PathExpression[];
      const pathExpression = moustacheStatement.path as hbs.AST.PathExpression;

      return paramsExpressionList[0]?.original || pathExpression.original;
    });
}
