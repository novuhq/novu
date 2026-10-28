import { describe, expect, it } from 'vitest';
import type { VoiceTurnResult } from '../api/agent-inbox';
import { EXIT_DENIED, EXIT_ERROR, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT } from '../output';
import { exitCodeForVoiceTurn } from './interact';

describe('exitCodeForVoiceTurn', () => {
  const cases: Array<{ name: string; result: VoiceTurnResult; code: number }> = [
    { name: 'settled approve', result: { status: 'settled', decision: 'approve' }, code: EXIT_OK },
    { name: 'settled deny', result: { status: 'settled', decision: 'deny' }, code: EXIT_DENIED },
    { name: 'settled choose', result: { status: 'settled', optionId: 'canary' }, code: EXIT_OK },
    { name: 'utterance', result: { status: 'utterance', utterance: 'yes' }, code: EXIT_TIMEOUT },
    { name: 'timeout', result: { status: 'timeout' }, code: EXIT_TIMEOUT },
    { name: 'ringing', result: { status: 'ringing' }, code: EXIT_TIMEOUT },
    { name: 'ended without settle', result: { status: 'ended', endReason: 'person_hangup' }, code: EXIT_GONE },
    {
      name: 'ended after approve',
      result: { status: 'ended', interactionStatus: 'approved' },
      code: EXIT_OK,
    },
    {
      name: 'ended failed',
      result: { status: 'ended', interactionStatus: 'failed' },
      code: EXIT_ERROR,
    },
  ];

  for (const { name, result, code } of cases) {
    it(`maps ${name} to ${code}`, () => {
      expect(exitCodeForVoiceTurn(result)).toBe(code);
    });
  }
});
