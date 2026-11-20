import { describe, it } from 'vitest';
import { agent } from './agent.resource';

describe('ctx.toolApproval.request', () => {
  it('can be returned from onMessage to end the turn', () => {
    agent('weather-bot', {
      onMessage: async (_message, ctx) => ctx.toolApproval.request({ id: 'tc-1', name: 'get_weather' }),
    });
  });
});
