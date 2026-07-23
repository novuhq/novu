import { pluralize, toSentence } from '@novu/framework/internal';

const DEFAULT_COUNT_SINGULAR = 'notification';
const DEFAULT_COUNT_PLURAL = 'notifications';
const DEFAULT_SENTENCE_KEY_PATH = 'payload.name';
const DEFAULT_SENTENCE_LIMIT = 2;
const DEFAULT_SENTENCE_OVERFLOW = 'other';

export function enhanceDigestStepOutputs(outputs: Record<string, unknown>): Record<string, unknown> {
  const events = outputs.events;

  if (!Array.isArray(events)) {
    return outputs;
  }

  const eventCount = typeof outputs.eventCount === 'number' ? outputs.eventCount : events.length;

  return {
    ...outputs,
    eventCount,
    countSummary: pluralize(eventCount, DEFAULT_COUNT_SINGULAR, DEFAULT_COUNT_PLURAL),
    sentenceSummary: toSentence(
      events,
      DEFAULT_SENTENCE_KEY_PATH,
      DEFAULT_SENTENCE_LIMIT,
      DEFAULT_SENTENCE_OVERFLOW
    ),
  };
}

export function enhanceStepsMap(
  stepsMap: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(stepsMap).map(([stepId, outputs]) => [stepId, enhanceDigestStepOutputs(outputs)])
  );
}
