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

  it('rejects json-logic operators that skip QueryValidatorService', () => {
    const logIssues = getIntegrationRulesIssues({
      log: { var: 'subscriber.email' },
    });
    const mapIssues = getIntegrationRulesIssues({
      map: [[{ var: 'subscriber.data' }], { var: '' }],
    });
    const nestedReduceIssues = getIntegrationRulesIssues({
      and: [
        {
          '==': [{ var: 'tenant.identifier' }, { '+': [1, 2] }],
        },
      ],
    });

    expect(logIssues.some((issue) => issue.includes('Unsupported operator "log"'))).to.equal(true);
    expect(mapIssues.some((issue) => issue.includes('Unsupported operator "map"'))).to.equal(true);
    expect(nestedReduceIssues.some((issue) => issue.includes('Unsupported operator "+"'))).to.equal(true);
  });

  it('rejects vars nested under operators QueryValidatorService does not inspect', () => {
    const issues = getIntegrationRulesIssues({
      null: [{ var: 'payload.foo' }],
    });

    expect(issues.length).to.be.greaterThan(0);
  });

  it('accepts and/or groups of comparison rules', () => {
    const valid = getIntegrationRulesIssues({
      and: [{ '==': [{ var: 'tenant.identifier' }, 'acme'] }, { '==': [{ var: 'subscriber.locale' }, 'fr'] }],
    });

    expect(valid).to.deep.equal([]);
  });
});
