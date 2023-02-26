import { CompileTemplate } from './compile-template/compile-template.usecase';
import { CompileEmailTemplate } from './compile-email-template/compile-email-template.usecase';

export * from './compile-template/compile-template.usecase';
export * from './compile-template/compile-template.command';

export const USE_CASES = [
  CompileTemplate,
  CompileEmailTemplate,
  //
];
