import { describe, expect, it } from 'vitest';
import {
  decodeHitlActionId,
  encodeHitlActionId,
  renderInputRequests,
  toInputResponse,
  type RenderableInputRequest,
} from './hitl.js';

describe('HITL action-id codec', () => {
  it('round-trips requestId + optionId', () => {
    const id = encodeHitlActionId('req_1', 'approve');
    expect(decodeHitlActionId(id)).toEqual({ requestId: 'req_1', optionId: 'approve' });
  });

  it('returns null for non-HITL (custom tier-2) action ids', () => {
    expect(decodeHitlActionId('snooze')).toBeNull();
    expect(decodeHitlActionId('unsubscribe')).toBeNull();
    expect(decodeHitlActionId(undefined)).toBeNull();
  });

  it('maps an option click to an inputResponse', () => {
    const decoded = decodeHitlActionId(encodeHitlActionId('req_2', 'deny'))!;
    expect(toInputResponse(decoded, undefined)).toEqual({ requestId: 'req_2', optionId: 'deny', text: undefined });
  });

  it('maps the freeform sentinel to a text inputResponse (no optionId)', () => {
    const decoded = decodeHitlActionId(encodeHitlActionId('req_3', '__freeform__'))!;
    expect(toInputResponse(decoded, 'ship it')).toEqual({ requestId: 'req_3', text: 'ship it' });
  });
});

describe('renderInputRequests', () => {
  it('renders a card (not markdown) with the prompt as title for a request with options', () => {
    const requests: RenderableInputRequest[] = [
      {
        requestId: 'req_1',
        prompt: 'Deploy to production?',
        options: [
          { id: 'approve', label: 'Approve', style: 'primary' },
          { id: 'deny', label: 'Deny', style: 'danger' },
        ],
      },
    ];
    const content = renderInputRequests(requests);
    expect(content.card).toBeTruthy();
    expect(content.markdown).toBeUndefined();
  });

  it('returns empty markdown when there are no requests', () => {
    expect(renderInputRequests([])).toEqual({ markdown: '' });
  });
});
