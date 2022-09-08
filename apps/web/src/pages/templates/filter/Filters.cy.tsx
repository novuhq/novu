import { StepTypeEnum } from '@novu/shared';
import { TestWrapper } from '../../../testing';
import { Filters, translateOperator } from './Filters';

const defaultStep = {
  id: '',
  _templateId: '',
  template: {
    type: StepTypeEnum.EMAIL,
    content: '',
  },
  active: true,
};

describe('Filters Component', function () {
  it('should not render if step is null', function () {
    cy.mount(
      <TestWrapper>
        <Filters step={null} />
      </TestWrapper>
    );

    cy.get('.filter-item').should('have.length', 0);
  });

  it('should not render if step filters is not preset', function () {
    cy.mount(
      <TestWrapper>
        <Filters
          step={{
            ...defaultStep,
          }}
        />
      </TestWrapper>
    );

    cy.get('.filter-item').should('have.length', 0);
  });

  it('should not render if step filter do not have children', function () {
    cy.mount(
      <TestWrapper>
        <Filters
          step={{
            ...defaultStep,
            filters: [{}],
          }}
        />
      </TestWrapper>
    );

    cy.get('.filter-item').should('have.length', 0);

    cy.mount(
      <TestWrapper>
        <Filters
          step={{
            ...defaultStep,
            filters: [
              {
                children: [],
              },
            ],
          }}
        />
      </TestWrapper>
    );
    cy.get('.filter-item').should('have.length', 0);
  });

  it('should render filter', function () {
    cy.mount(
      <TestWrapper>
        <Filters
          step={{
            ...defaultStep,
            filters: [
              {
                children: [
                  {
                    on: 'payload',
                    field: 'name',
                    value: 'Novu',
                    operator: 'EQUAL',
                  },
                ],
              },
            ],
          }}
        />
      </TestWrapper>
    );
    cy.get('.filter-item').should('have.length', 1);
    cy.get('.filter-item').contains('payload name equal');
    cy.get('.filter-item-value').contains('Novu');
  });

  it('should print correct translation of operator', () => {
    expect(translateOperator('EQUAL')).to.equal('equal');
    expect(translateOperator('NOT_EQUAL')).to.equal('not equal');
    expect(translateOperator('LARGER')).to.equal('larger');
    expect(translateOperator('SMALLER')).to.equal('smaller');
    expect(translateOperator('LARGER_EQUAL')).to.equal('larger or equal');
    expect(translateOperator('SMALLER_EQUAL')).to.equal('smaller or equal');
    expect(translateOperator('NOT_IN')).to.equal('do not include');
    expect(translateOperator('IN')).to.equal('includes');
  });
});
