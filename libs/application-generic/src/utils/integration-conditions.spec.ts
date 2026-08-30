import { expect } from 'chai';
import { getIntegrationRulesIssues, hasIntegrationRules } from './integration-conditions';

describe('integration rules helpers', () => {
  it('detects non-empty JsonLogic', () => {
    expect(hasIntegrationRules({ '==': [{ var: 'tenant.identifier' }, 'acme'] })).to.equal(true);
    expect(hasIntegrationRules({})).to.equal(false);
    expect(hasIntegrationRules(null)).to.equal(false);
  });

  it('rejects payload fields and accepts tenant fields', () => {
    const invalid = getIntegrationRulesIssues({
      '==': [{ var: 'payload.foo' }, 'bar'],
    });
    const valid = getIntegrationRulesIssues({
      '==': [{ var: 'tenant.identifier' }, 'acme'],
    });

    expect(invalid.length).to.be.greaterThan(0);
    expect(valid).to.deep.equal([]);
  });

  it('accepts context.tenant.id', () => {
    const valid = getIntegrationRulesIssues({
      '==': [{ var: 'context.tenant.id' }, 'acme'],
    });

    expect(valid).to.deep.equal([]);
  });
});
