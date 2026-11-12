import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FIRST_MESSAGE,
  fillFirstMessage,
  firstMessageBadge,
  firstMessageProblem,
} from './whatsapp-first-message';

describe('the WhatsApp first message', () => {
  it('takes our suggestion as it is', () => {
    expect(firstMessageProblem(DEFAULT_FIRST_MESSAGE)).toBeNull();
  });

  it('says what Meta would turn down, the way the API does', () => {
    expect(firstMessageProblem('')).toBe('Write the message first.');
    expect(firstMessageProblem('Hi {{name}}, reply here.')).toContain('only variable');
    expect(firstMessageProblem('{{agent_name}} wrote to you.')).toContain('start or end');
    expect(firstMessageProblem('Hi {{agent_name}}, {{agent_name}} again.')).toContain('once');
    expect(firstMessageProblem('a'.repeat(1025))).toContain('1024');
  });

  it('previews it with the agent’s name filled in', () => {
    expect(fillFirstMessage(DEFAULT_FIRST_MESSAGE, 'Atlas')).toBe(
      'You have a message from Atlas. Reply here to view it.'
    );
  });

  it('reads Meta’s review as a badge', () => {
    const at = (status: string) => firstMessageBadge({ status, body: 'x', approved: false });

    expect(firstMessageBadge(undefined)).toBeNull();
    expect(at('APPROVED')).toEqual({ label: 'Approved', variant: 'success' });
    expect(at('PENDING')).toEqual({ label: 'In review', variant: 'pending' });
    expect(at('REJECTED')).toEqual({ label: 'Rejected', variant: 'danger' });
  });
});
