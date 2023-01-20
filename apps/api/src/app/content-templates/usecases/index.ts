import { CompileTemplate } from './compile-template/compile-template.usecase';
import { CompileEmailTemplate } from './compile-template/email/compile-email-template.usecase';

export * from './compile-template/compile-template.usecase';
export * from './compile-template/compile-template.command';
export * from './compile-template/email/compile-email-template.usecase';
export * from './compile-template/email/compile-email-template.command';

export const USE_CASES = [
  CompileTemplate,
  CompileEmailTemplate,
  //
];
