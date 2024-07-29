import {
  camelCase,
  capitalCase,
  constantCase,
  kebabCase,
  pascalCase,
  snakeCase,
} from './utils/change-case';
import { IOptions } from './utils/change-case/functions';
import { deepmerge } from './utils/deepmerge.utils';
import { WithPassthrough } from './utils/types';

export enum CasingEnum {
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase',
  CAPITAL_CASE = 'CapitalCase',
  SNAKE_CASE = 'snake_case',
  KEBAB_CASE = 'kebabcase',
  CONSTANT_CASE = 'CONSTANT_CASE',
}

type TransformOutput<T> = {
  body: T;
  headers: Record<string, string>;
  query: Record<string, string>;
};

export abstract class BaseProvider {
  protected casing: CasingEnum | undefined;

  protected keyCaseObject: Record<string, string> = {};

  protected transform<
    Output = Record<string, unknown>,
    Input = Record<string, unknown>,
    Data = Record<string, unknown>
  >(
    bridgeProvderData: WithPassthrough<Input>,
    data: Data
  ): TransformOutput<Output> {
    const result = this.casingTransform<Input, Output>(bridgeProvderData);

    return {
      body: deepmerge(
        data as unknown as Record<string, unknown>,
        result.body as unknown as Record<string, unknown>
      ) as Output,
      headers: result.headers,
      query: result.query,
    } as TransformOutput<Output>;
  }

  private keyCaseTransformer(key: string) {
    return this.keyCaseObject[key] ? this.keyCaseObject[key] : key;
  }

  private casingTransform<Input = Record<string, unknown>, Output = unknown>(
    bridgeProvderData: WithPassthrough<Input>
  ): TransformOutput<Output> {
    const {
      _passthrough = {
        body: {},
        headers: {},
        query: {},
      },
      ...data
    } = bridgeProvderData;
    let casing = (object: unknown, depth?: number, options?: IOptions) =>
      object;

    switch (this.casing) {
      case CasingEnum.PASCAL_CASE:
        casing = pascalCase;
        break;
      case CasingEnum.CAPITAL_CASE:
        casing = capitalCase;
        break;
      case CasingEnum.SNAKE_CASE:
        casing = snakeCase;
        break;
      case CasingEnum.KEBAB_CASE:
        casing = kebabCase;
        break;
      case CasingEnum.CONSTANT_CASE:
        casing = constantCase;
        break;
      case CasingEnum.CAMEL_CASE:
        casing = camelCase;
        break;
    }

    const body = casing(data, 10000, {
      keyCaseTransformer: this.keyCaseTransformer.bind(this),
    }) as Record<string, unknown>;

    return {
      body: deepmerge(body, _passthrough.body) as Output,
      headers: {
        ..._passthrough.headers,
      },
      query: {
        ..._passthrough.query,
      },
    };
  }
}
