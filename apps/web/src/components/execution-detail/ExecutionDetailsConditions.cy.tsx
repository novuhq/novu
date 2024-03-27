import { FieldOperatorEnum, ICondition, TimeOperatorEnum } from '@novu/shared';

import { TestWrapper } from '../../testing';
import { ExecutionDetailsConditions } from './ExecutionDetailsConditions';

const conditions: ICondition[] = [
  {
    filter: 'Payload',
    field: 'test',
    expected: '1000',
    actual: '100000000',
    operator: FieldOperatorEnum.LARGER,
    passed: true,
  },
  {
    filter: 'Online right now',
    field: 'isOnline',
    expected: 'true',
    actual: 'true',
    operator: FieldOperatorEnum.EQUAL,
    passed: true,
  },
  {
    filter: "Online in the last 'X' time period",
    field: 'isOnline',
    expected: 'true',
    actual: 'true',
    operator: TimeOperatorEnum.MINUTES,
    passed: true,
  },
  {
    filter: 'Webhook',
    field: 'test-key',
    expected: 'test-value',
    actual: 'wrong-value',
    operator: FieldOperatorEnum.EQUAL,
    passed: false,
  },
];

describe('Execution Details Condition Component', function () {
  it('should render ExecutionDetailsConditions properly', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditions conditions={conditions} />
      </TestWrapper>
    );
  });

  it('should render the conditions', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditions conditions={conditions} />
      </TestWrapper>
    );

    cy.getByTestId('condition-item-list').should('have.length', conditions.length);
  });

  it("shouldn't render conditions if empty conditions are provided", function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditions conditions={[]} />
      </TestWrapper>
    );

    cy.getByTestId('condition-item-list').should('have.length', 0);
  });
});
