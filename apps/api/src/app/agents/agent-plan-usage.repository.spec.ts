import { AgentRepository } from '@novu/dal';
import { expect } from 'chai';

const ORGANIZATION_ID = '66f000000000000000000001';
const ENVIRONMENT_ID = '66f000000000000000000002';
const NEWER_AGENT_ID = '66f000000000000000000004';

describe('AgentRepository plan-usage counts', () => {
  it('does not count a human relay toward another agent’s plan rank', async () => {
    const repository = new AgentRepository();
    const counted: Array<Record<string, unknown>> = [];
    repository.count = async (query) => {
      counted.push(query as Record<string, unknown>);

      return 0;
    };

    await repository.countOlderAgentsInEnvironment(ORGANIZATION_ID, ENVIRONMENT_ID, NEWER_AGENT_ID);
    await repository.countActiveInEnvironment(ORGANIZATION_ID, ENVIRONMENT_ID);
    await repository.countTotalInEnvironment(ORGANIZATION_ID, ENVIRONMENT_ID);

    for (const query of counted) {
      expect(query.runtime).to.deep.equal({ $ne: 'human_relay' });
    }
  });

  it('leaves the human relay out of the agents that fill plan slots', async () => {
    const repository = new AgentRepository();
    let query: Record<string, unknown> | undefined;
    repository.find = async (nextQuery) => {
      query = nextQuery as Record<string, unknown>;

      return [];
    };

    await repository.findOldestAgentIds(ORGANIZATION_ID, ENVIRONMENT_ID, 2);

    expect(query?.runtime).to.deep.equal({ $ne: 'human_relay' });
    expect(query?.active).to.equal(true);
  });
});
