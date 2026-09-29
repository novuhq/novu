import { SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import { buildWorkflowVariables, buildWorkflowVariablesForJob } from './build-workflow-variables';

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

describe('buildWorkflowVariablesForJob', () => {
  it('uses the persisted workflow when present', () => {
    const variables = buildWorkflowVariablesForJob({
      identifier: 'trigger-id',
      tags: ['bridge'],
      workflow: {
        name: 'Order confirmation',
        description: 'Sent after an order is placed',
        tags: ['transactional'],
        severity: SeverityLevelEnum.HIGH,
        triggers: [{ identifier: 'order-confirmation' }],
      },
    });

    expect(variables).to.deep.equal({
      workflowId: 'order-confirmation',
      name: 'Order confirmation',
      description: 'Sent after an order is placed',
      tags: ['transactional'],
      severity: SeverityLevelEnum.HIGH,
    });
  });

  it('uses discovered metadata when no persisted workflow is available', () => {
    const variables = buildWorkflowVariablesForJob({
      identifier: 'wf-identifier',
      workflowMetadata: {
        name: 'Order confirmation',
        description: 'Sent after an order is placed',
      },
      tags: ['bridge'],
      severity: SeverityLevelEnum.MEDIUM,
    });

    expect(variables).to.deep.equal({
      workflowId: 'wf-identifier',
      name: 'Order confirmation',
      description: 'Sent after an order is placed',
      tags: ['bridge'],
      severity: SeverityLevelEnum.MEDIUM,
    });
  });

  it('falls back to the trigger identifier when discovered metadata has no name', () => {
    const variables = buildWorkflowVariablesForJob({
      identifier: 'wf-identifier',
    });

    expect(variables.name).to.equal('wf-identifier');
    expect(variables.workflowId).to.equal('wf-identifier');
  });
});
