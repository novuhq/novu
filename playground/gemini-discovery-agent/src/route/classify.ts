import type { Config } from '../config.ts';
import { classifyWithGemini } from './gemini.ts';
import { type ClassifierInput, scoreWithJev } from './jev.ts';
import type { Scores } from './policy.ts';

/** Jev first; on any Jev failure (no key, error, timeout) Gemini Flash-Lite with a JSON schema. */
export async function classify(config: Config, input: ClassifierInput): Promise<{ scores: Scores; jevError?: string }> {
  try {
    return { scores: await scoreWithJev(config, input) };
  } catch (err) {
    return { scores: await classifyWithGemini(config, input), jevError: err instanceof Error ? err.message : String(err) };
  }
}
