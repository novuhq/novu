import { FieldOperatorEnum, ICondition } from '@novu/shared';
import { TestWrapper } from '../../testing';
import { ExecutionDetailsConditionItem } from './ExecutionDetailsConditionItem';

const condition: ICondition = {
  filter: 'Payload',
  field: 'test',
  expected: '1000',
  actual: '100000000',
  operator: FieldOperatorEnum.LARGER,
  passed: true,
};

describe('Execution Details Condition Component', function () {
  it('should render ExecutionDetailsConditions properly', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem condition={condition} />
      </TestWrapper>
    );

    cy.getByTestId('condition-item-list').should('have.length', 1);
  });

  it('should render the conditions with the details provided', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem condition={condition} />
      </TestWrapper>
    );

    cy.getByTestId('condition-item-list').should('have.length', 1);
    cy.getByTestId('condition-filter-value').should('have.text', condition.filter);
    cy.getByTestId('condition-field-value').should('have.text', condition.field);
    cy.getByTestId('condition-operator-value').should('have.text', condition.operator);
    cy.getByTestId('condition-expected-value').should('have.text', condition.expected);
    cy.getByTestId('condition-actual-value').should('have.text', condition.actual);
  });

  it('should render error icon with failed class and error color if passed:false', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem
          condition={{
            ...condition,
            passed: false,
          }}
        />
      </TestWrapper>
    );

    cy.get('.condition-passed').should('have.length', 0);
    cy.get('.condition-failed').should('have.length', 1);
    cy.get('.condition-failed').should('have.css', 'color', 'rgb(229, 69, 69)');
  });

  it('should render error icon with passed class and success color if passed:true', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem
          condition={{
            ...condition,
            passed: true,
          }}
        />
      </TestWrapper>
    );

    cy.get('.condition-failed').should('have.length', 0);
    cy.get('.condition-passed').should('have.length', 1);
    cy.get('.condition-passed').should('have.css', 'color', 'rgb(77, 153, 128)');
  });

  it('should render expected and actual values with error color if passed:false', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem
          condition={{
            ...condition,
            passed: false,
          }}
        />
      </TestWrapper>
    );

    cy.getByTestId('condition-actual-value').should('have.css', 'color', 'rgb(229, 69, 69)');
    cy.getByTestId('condition-expected-value').should('have.css', 'color', 'rgb(229, 69, 69)');
  });

  it('should render expected and actual values with success color if passed:true', function () {
    cy.mount(
      <TestWrapper>
        <ExecutionDetailsConditionItem
          condition={{
            ...condition,
            passed: true,
          }}
        />
      </TestWrapper>
    );

    cy.getByTestId('condition-actual-value').should('have.css', 'color', 'rgb(77, 153, 128)');
    cy.getByTestId('condition-expected-value').should('have.css', 'color', 'rgb(77, 153, 128)');
  });
});
