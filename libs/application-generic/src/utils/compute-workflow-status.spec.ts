import { ContentIssueEnum, WorkflowStatusEnum } from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { computeWorkflowStatus } from './compute-workflow-status';

describe('computeWorkflowStatus', () => {
  it('returns INACTIVE when workflow is not active', () => {
    expect(
      computeWorkflowStatus(false, [
        { issues: { controls: { body: [{ message: 'required', issueType: ContentIssueEnum.MISSING_VALUE }] } } },
      ])
    ).to.equal(WorkflowStatusEnum.INACTIVE);
  });

  it('returns ACTIVE when workflow is active and steps have no control issues', () => {
    expect(computeWorkflowStatus(true, [{ issues: {} }, { issues: undefined }])).to.equal(WorkflowStatusEnum.ACTIVE);
  });

  it('returns ERROR when workflow is active and at least one step has control issues', () => {
    expect(
      computeWorkflowStatus(true, [
        { issues: {} },
        { issues: { controls: { body: [{ message: 'required', issueType: ContentIssueEnum.MISSING_VALUE }] } } },
      ])
    ).to.equal(WorkflowStatusEnum.ERROR);
  });

  it('returns ACTIVE when control issues were cleared from all steps', () => {
    expect(computeWorkflowStatus(true, [{ issues: { controls: {} } }, { issues: {} }])).to.equal(
      WorkflowStatusEnum.ACTIVE
    );
  });
});
