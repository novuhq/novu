import { describe, expect, it } from 'vitest';
import { transcriptText } from './graders.js';
import { RunRecorder } from './recorder.js';

describe('transcriptText', () => {
  it('does not duplicate the final assistant turn', () => {
    const recorder = new RunRecorder('s', 'prompt');
    recorder.recordAssistantMessage('first turn');
    recorder.recordAssistantMessage('final turn');

    const result = recorder.build();

    // finalText mirrors the last assistant message, so the transcript must contain
    // "final turn" exactly once.
    expect(result.finalText).toBe('final turn');
    expect(transcriptText(result)).toBe('first turn\nfinal turn');
    expect(transcriptText(result).match(/final turn/g)).toHaveLength(1);
  });

  it('is empty when no assistant messages were recorded', () => {
    const result = new RunRecorder('s', 'prompt').build();

    expect(transcriptText(result)).toBe('');
  });
});
