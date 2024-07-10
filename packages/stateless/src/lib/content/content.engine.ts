import * as Handlebars from 'handlebars';
import {
  IAttachmentOptions,
  ITriggerPayload,
} from '../template/template.interface';

Handlebars.registerHelper(
  'equals',
  function helper(this: typeof Handlebars, arg1, arg2, options) {
    // eslint-disable-next-line eqeqeq
    return arg1 == arg2 ? options.fn(this) : options.inverse(this);
  }
);

type ContentEnginePayload = {
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
    | IAttachmentOptions[]
    | Record<string, unknown>;
};

export interface IContentEngine {
  compileTemplate: (content: string, payload: ContentEnginePayload) => string;
  extractMessageVariables: (content: string) => Array<string>;
}

export class HandlebarsContentEngine implements IContentEngine {
  compileTemplate(content: string, payload: ContentEnginePayload): string {
    const template = Handlebars.compile<ContentEnginePayload>(content);

    return template(payload);
  }

  extractMessageVariables(content: string): string[] {
    return getHandlebarsVariables(content);
  }
}

function getHandlebarsVariables(input: string): string[] {
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
