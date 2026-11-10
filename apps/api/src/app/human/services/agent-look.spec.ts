import { expect } from 'chai';
import { agentLookOf, cardShownOf, ORIGINAL_AGENT_LOOK } from './agent-look';

describe('agentLookOf', () => {
  it('reads the look the operator picked', () => {
    const look = { shape: 'bean', color: 'marigold', art: { kind: 'waves', seed: 42 } } as const;

    expect(agentLookOf({ look })).to.deep.equal(look);
  });

  it('gives an agent nobody picked a look for the original one: an orb in ember, with rays', () => {
    expect(agentLookOf({})).to.deep.equal({ shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } });
  });

  it('never mixes the original look with a look stored in part, or with a value it no longer knows', () => {
    const partial = { shape: 'bean', color: 'marigold' };
    const unknownShape = { shape: 'cube', color: 'marigold', art: { kind: 'waves', seed: 1 } };
    const negativeSeed = { shape: 'bean', color: 'marigold', art: { kind: 'waves', seed: -1 } };
    const fractionSeed = { shape: 'bean', color: 'marigold', art: { kind: 'waves', seed: 1.5 } };

    for (const look of [partial, unknownShape, negativeSeed, fractionSeed]) {
      expect(agentLookOf({ look: look as never })).to.deep.equal(ORIGINAL_AGENT_LOOK);
    }
  });

  it('hands out a copy, so nobody can change the original look', () => {
    const look = agentLookOf({});
    look.art.seed = 7;

    expect(ORIGINAL_AGENT_LOOK.art.seed).to.equal(0);
  });
});

describe('cardShownOf', () => {
  it('is null until a host showed the card', () => {
    expect(cardShownOf({})).to.equal(null);
  });

  it('says when, and through which host when it said', () => {
    expect(cardShownOf({ cardShown: { at: '2026-11-09T10:00:00.000Z', via: 'mcp', host: 'chatgpt' } })).to.deep.equal({
      at: '2026-11-09T10:00:00.000Z',
      via: 'mcp',
      host: 'chatgpt',
    });
    expect(cardShownOf({ cardShown: { at: '2026-11-09T10:00:00.000Z' } })).to.deep.equal({
      at: '2026-11-09T10:00:00.000Z',
    });
  });
});
