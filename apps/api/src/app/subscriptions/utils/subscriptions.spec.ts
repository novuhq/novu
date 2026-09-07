import { expect } from 'chai';
import { convertPreferencesToGroupFilters } from './subscriptions';

describe('convertPreferencesToGroupFilters', () => {
  it('should convert a string workflow id into a group filter', () => {
    const result = convertPreferencesToGroupFilters(['workflow-1']);

    expect(result).to.deep.equal([
      {
        filter: {
          workflowIds: ['workflow-1'],
        },
      },
    ]);
  });

  it('should pass through group filter preferences unchanged', () => {
    const preference = {
      filter: { workflowIds: ['workflow-1'] },
      enabled: false,
      condition: { '==': [{ var: 'status' }, 'active'] },
    };

    const result = convertPreferencesToGroupFilters([preference]);

    expect(result).to.deep.equal([preference]);
  });

  it('should preserve enabled and condition when converting the workflowId shape', () => {
    const result = convertPreferencesToGroupFilters([
      {
        workflowId: 'workflow-1',
        enabled: false,
        condition: { '==': [{ var: 'tier' }, 'premium'] },
      },
    ]);

    expect(result).to.deep.equal([
      {
        filter: {
          workflowIds: ['workflow-1'],
        },
        condition: { '==': [{ var: 'tier' }, 'premium'] },
        enabled: false,
      },
    ]);
  });
});
