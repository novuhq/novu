import { ContentIssueEnum, WorkflowStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import { computeWorkflowStatus, hasControlIssues } from './compute-workflow-status';

describe('computeWorkflowStatus', () => {
  it('should return INACTIVE when workflow is not active', () => {
    const status = computeWorkflowStatus(false, [{ issues: { controls: { body: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'required' }] } } }]);

    expect(status).to.equal(WorkflowStatusEnum.INACTIVE);
  });

  it('should return ACTIVE when workflow is active and steps have no control issues', () => {
    const status = computeWorkflowStatus(true, [{ issues: {} }, { issues: undefined }]);

    expect(status).to.equal(WorkflowStatusEnum.ACTIVE);
  });

  it('should return ERROR when workflow is active and a step has control issues', () => {
    const status = computeWorkflowStatus(true, [
      { issues: { controls: { body: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'required' }] } } },
    ]);

    expect(status).to.equal(WorkflowStatusEnum.ERROR);
  });
});

describe('hasControlIssues', () => {
  it('should return false when controls are empty or missing', () => {
    expect(hasControlIssues(undefined)).to.equal(false);
    expect(hasControlIssues({})).to.equal(false);
    expect(hasControlIssues({ controls: {} })).to.equal(false);
  });

  it('should return true when controls contain issues', () => {
    expect(
      hasControlIssues({
        controls: { body: [{ issueType: ContentIssueEnum.MISSING_VALUE, message: 'required' }] },
      })
    ).to.equal(true);
  });
});
