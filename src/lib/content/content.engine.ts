import * as Handlebars from 'handlebars';

Handlebars.registerHelper('equals', function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

export function compileTemplate(
  content: string,
  data: {
    [key: string]:
      | string
      | { key: string }[]
      | string[]
      | number[]
      | boolean
      | number;
  }
) {
  const template = Handlebars.compile(content);

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
