import { toSentenceArgsValidator } from './to-sentence';
import { LiquidFilterIssue } from './types';

type FilterValidators = {
  [key: string]: (...args: any[]) => LiquidFilterIssue[];
};

export const FILTER_VALIDATORS: FilterValidators = {
  toSentence: toSentenceArgsValidator,
};
