import chalk from 'chalk';

export const log = {
  info: (message: string) => chalk.blue(message),
  warning: (message: string) => chalk.yellow(message),
  error: (message: string) => chalk.red(message),
  success: (message: string) => chalk.green(message),
  underline: (message: string) => chalk.underline(message),
  bold: (message: string) => chalk.bold(message),
};
export const EMOJI = {
  SUCCESS: log.success('✔'),
  ERROR: log.error('✗'),
  WARNING: log.warning('⚠'),
  INFO: log.info('ℹ'),
  ARROW: log.bold('→'),
  MOCK: log.info('○'),
  HYDRATED: log.bold(log.info('→')),
  STEP: log.info('σ'),
  ACTION: log.info('α'),
  DURATION: log.info('Δ'),
  PROVIDER: log.info('⚙'),
  OUTPUT: log.info('⇢'),
  INPUT: log.info('⇠'),
  WORKFLOW: log.info('ω'),
  STATE: log.info('σ'),
  EXECUTE: log.info('ε'),
  PREVIEW: log.info('ρ'),
};
