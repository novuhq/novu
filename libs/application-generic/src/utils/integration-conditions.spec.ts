import { expect } from 'chai';
import { getIntegrationRulesIssues, hasIntegrationRules } from './integration-conditions';

describe('integration rules helpers', () => {
  it('detects non-empty JsonLogic', () => {
    expect(hasIntegrationRules({ '==': [{ var: 'context.tenant.id' }, 'acme'] })).to.equal(true);
    expect(hasIntegrationRules({})).to.equal(false);
    expect(hasIntegrationRules(null)).to.equal(false);
  });

  it('accepts workflow payload and subscriber fields and rejects deprecated tenant fields', () => {
    const validPayload = getIntegrationRulesIssues({
      '==': [{ var: 'payload.foo' }, 'bar'],
    });
    const invalidTenant = getIntegrationRulesIssues({
      '==': [{ var: 'tenant.identifier' }, 'acme'],
    });
    const valid = getIntegrationRulesIssues({
      '==': [{ var: 'subscriber.locale' }, 'fr'],
    });

    expect(validPayload).to.deep.equal([]);
    expect(invalidTenant.length).to.be.greaterThan(0);
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
          '==': [{ var: 'subscriber.locale' }, { '+': [1, 2] }],
        },
      ],
    });

    expect(logIssues.some((issue) => issue.includes('Unsupported operator "log"'))).to.equal(true);
    expect(mapIssues.some((issue) => issue.includes('Unsupported operator "map"'))).to.equal(true);
    expect(nestedReduceIssues.some((issue) => issue.includes('Unsupported operator "+"'))).to.equal(true);
  });

  it('rejects multi-key nodes used to smuggle operators and vars past validation', () => {
    const smuggledOperatorIssues = getIntegrationRulesIssues({
      and: [{ log: { var: 'subscriber.email' }, dummy: 'bypass' }],
    });
    const smuggledVarIssues = getIntegrationRulesIssues({
      and: [{ var: 'actor.email', dummy: 'bypass' }],
    });
    const nestedUnderNegationIssues = getIntegrationRulesIssues({
      '!': { map: [[{ var: 'subscriber.data' }], { var: '' }], dummy: 'bypass' },
    });

    expect(smuggledOperatorIssues.length).to.be.greaterThan(0);
    expect(smuggledVarIssues.length).to.be.greaterThan(0);
    expect(nestedUnderNegationIssues.length).to.be.greaterThan(0);
  });

  it('rejects vars nested under operators QueryValidatorService does not inspect', () => {
    const issues = getIntegrationRulesIssues({
      null: [{ var: 'actor.email' }],
    });

    expect(issues.length).to.be.greaterThan(0);
  });

  it('accepts and/or groups of comparison rules', () => {
    const valid = getIntegrationRulesIssues({
      and: [{ '==': [{ var: 'context.tenant.id' }, 'acme'] }, { '==': [{ var: 'subscriber.locale' }, 'fr'] }],
    });

    expect(valid).to.deep.equal([]);
  });
});
