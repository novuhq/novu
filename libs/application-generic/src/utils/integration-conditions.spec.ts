import { expect } from 'chai';
import { evaluateIntegrationRules, getIntegrationRulesIssues, hasIntegrationRules } from './integration-conditions';

describe('integration rules helpers', () => {
  it('detects non-empty JsonLogic', () => {
    expect(hasIntegrationRules({ '==': [{ var: 'context.tenant.id' }, 'acme'] })).to.equal(true);
    expect(hasIntegrationRules({})).to.equal(false);
    expect(hasIntegrationRules(null)).to.equal(false);
  });

  it('accepts workflow and subscriber fields and rejects payload and deprecated tenant fields', () => {
    const invalidPayload = getIntegrationRulesIssues({
      '==': [{ var: 'payload.foo' }, 'bar'],
    });
    const invalidTenant = getIntegrationRulesIssues({
      '==': [{ var: 'tenant.identifier' }, 'acme'],
    });
    const valid = getIntegrationRulesIssues({
      '==': [{ var: 'subscriber.locale' }, 'fr'],
    });

    expect(invalidPayload.length).to.be.greaterThan(0);
    expect(invalidTenant.length).to.be.greaterThan(0);
    expect(valid).to.deep.equal([]);
  });

  it('still evaluates already-saved payload rules at send time', () => {
    const matching = evaluateIntegrationRules(
      { '==': [{ var: 'payload.region' }, 'eu'] },
      { payload: { region: 'eu' } }
    );

    expect(matching).to.deep.equal({ result: true, issues: [] });
  });

  it('accepts context.tenant.id', () => {
    const valid = getIntegrationRulesIssues({
      '==': [{ var: 'context.tenant.id' }, 'acme'],
    });

    expect(valid).to.deep.equal([]);
  });

  it('accepts and evaluates workflow fields', () => {
    const result = evaluateIntegrationRules(
      {
        and: [
          { '==': [{ var: 'workflow.name' }, 'Order confirmation'] },
          { containsAny: [{ var: 'workflow.tags' }, ['transactional']] },
        ],
      },
      {
        workflow: {
          name: 'Order confirmation',
          tags: ['transactional'],
        },
      }
    );

    expect(result).to.deep.equal({ result: true, issues: [] });
    expect(getIntegrationRulesIssues({ '==': [{ var: 'workflow.internalField' }, 'secret'] })).not.to.deep.equal([]);
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

  it('validates and evaluates integration rules through one boundary', () => {
    const matching = evaluateIntegrationRules(
      { '==': [{ var: 'context.tenant.data.region' }, 'eu'] },
      { context: { tenant: { data: { region: 'eu' } } } }
    );
    const invalid = evaluateIntegrationRules(
      { log: { var: 'context.tenant.data.region' } },
      { context: { tenant: { data: { region: 'eu' } } } }
    );

    expect(matching).to.deep.equal({ result: true, issues: [] });
    expect(invalid.result).to.equal(false);
    expect(invalid.issues.some((issue) => issue.includes('log'))).to.equal(true);
  });
});
