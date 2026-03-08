import type { ICompileContext } from '../../../types/compile-context';

export type { ICompileContext };

/** @deprecated Use ICompileContext instead */
export type IActionCompileContext = ICompileContext;

export interface IActionExecuteConfig<
  TControlValues = Record<string, unknown>,
  TCredentials = Record<string, unknown>,
  TCompileContext = ICompileContext,
> {
  controlValues: TControlValues;
  credentials: TCredentials;
  compileContext: TCompileContext;
  signatureHeaders?: Record<string, string>;
}

export interface IActionExecuteResult {
  [key: string]: unknown;
}

export interface IActionHandler {
  execute(config: IActionExecuteConfig): Promise<IActionExecuteResult>;
}
