import type { AgentStatus } from '@novu/thalamus';
import { expect } from 'chai';
import { mapStreamPart } from './stream-part-mapper';

describe('mapStreamPart run lifecycle', () => {
  it('maps run-start to the protocol run-start event', () => {
    expect(mapStreamPart({ type: 'run-start', sessionId: 'sess_1' })).to.deep.equal([{ type: 'run-start' }]);
  });

  // `status-change: running` accompanies `run-start` on both providers; mapping it too
  // would emit the run head twice.
  it('drops every status change', () => {
    const statuses: AgentStatus[] = ['running', 'queued', 'retrying', 'idle'];

    for (const status of statuses) {
      expect(mapStreamPart({ type: 'status-change', status })).to.deep.equal([]);
    }
  });

  it('maps provider-event to the protocol provider-event event', () => {
    expect(
      mapStreamPart({
        type: 'provider-event',
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0 },
      })
    ).to.deep.equal([
      {
        type: 'provider-event',
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0 },
      },
    ]);
  });
});
