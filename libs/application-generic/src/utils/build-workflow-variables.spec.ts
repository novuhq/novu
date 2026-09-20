import { expect } from 'chai';
import { buildWorkflowVariables } from './build-workflow-variables';

describe('buildWorkflowVariables', () => {
  it('maps the trigger identifier to workflowId and preserves advertised workflow fields', () => {
    const variables = buildWorkflowVariables({
      _id: 'tpl_1',
      name: 'Workflow Actual Name',
      description: 'A test workflow',
      tags: ['test'],
      severity: 'HIGH',
      triggers: [{ identifier: 'wf-identifier' }],
    });

    expect(variables.workflowId).to.equal('wf-identifier');
    expect(variables.name).to.equal('Workflow Actual Name');
    expect(variables.description).to.equal('A test workflow');
    expect(variables.tags).to.deep.equal(['test']);
    expect(variables.severity).to.equal('HIGH');
    expect(variables._id).to.equal('tpl_1');
  });

  it('leaves workflowId undefined when the workflow has no triggers', () => {
    const variables = buildWorkflowVariables({
      _id: 'tpl_1',
      name: 'Nameless trigger',
    });

    expect(variables.workflowId).to.equal(undefined);
    expect(variables.name).to.equal('Nameless trigger');
  });
});
