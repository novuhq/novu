import { toSentenceArgsValidator } from './to-sentence';
import { LiquidFilterIssue } from './types';

type FilterValidators = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => LiquidFilterIssue[];
};

export const FILTER_VALIDATORS: FilterValidators = {
  toSentence: toSentenceArgsValidator,
};
