import { SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import { buildWorkflowVariables } from './build-workflow-variables';

describe('buildWorkflowVariables', () => {
  it('maps the trigger identifier to workflowId and preserves advertised workflow fields', () => {
    const variables = buildWorkflowVariables({
      name: 'Workflow Actual Name',
      description: 'A test workflow',
      tags: ['test'],
      severity: SeverityLevelEnum.HIGH,
      triggers: [{ identifier: 'wf-identifier' }],
    });

    expect(variables.workflowId).to.equal('wf-identifier');
    expect(variables.name).to.equal('Workflow Actual Name');
    expect(variables.description).to.equal('A test workflow');
    expect(variables.tags).to.deep.equal(['test']);
    expect(variables.severity).to.equal(SeverityLevelEnum.HIGH);
  });

  it('exposes only the fields advertised by the variable schema', () => {
    const persistedWorkflow = {
      _id: 'tpl_1',
      _organizationId: 'org_1',
      rawData: { secret: 'do-not-leak' },
      steps: [{ _templateId: 'step_1' }],
      name: 'Workflow Actual Name',
      triggers: [{ identifier: 'wf-identifier' }],
    };

    const variables = buildWorkflowVariables(persistedWorkflow);

    expect(Object.keys(variables)).to.have.members(['workflowId', 'name', 'description', 'tags', 'severity']);
  });

  it('leaves workflowId undefined when the workflow has no triggers', () => {
    const variables = buildWorkflowVariables({ name: 'Nameless trigger' });

    expect(variables.workflowId).to.equal(undefined);
    expect(variables.name).to.equal('Nameless trigger');
  });
});
