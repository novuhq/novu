import {
  StepTypeEnum,
  IRealtimeOnlineFilterPart,
  IOnlineInLastFilterPart,
  IWebhookFilterPart,
  IFieldFilterPart,
  FilterPartTypeEnum,
  TimeOperatorEnum,
} from '@novu/shared';
import { FormProvider, useForm } from 'react-hook-form';

import { TestWrapper } from '../../../testing';
import { IStepEntity } from '../components/formTypes';
import { Filters, translateOperator, getFilterLabel } from './Filters';

const defaultStep: IStepEntity = {
  id: '',
  _templateId: '',
  template: {
    type: StepTypeEnum.EMAIL,
    content: '',
  },
  active: true,
  shouldStopOnFail: false,
};

const TestFormProvider = ({ children }) => {
  const methods = useForm({
    defaultValues: {
      steps: [],
    },
    mode: 'onChange',
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('Filters Component', function () {
  it('should not render if step is null', function () {
    cy.mount(
      <TestWrapper>
        <Filters />
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
        <TestFormProvider>
          <Filters
            step={{
              ...defaultStep,
              filters: [
                {
                  children: [
                    {
                      on: FilterPartTypeEnum.PAYLOAD,
                      field: 'name',
                      value: 'Novu',
                      operator: 'EQUAL',
                    },
                  ],
                },
              ],
            }}
          />
        </TestFormProvider>
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

  it('should print correct filter description value according to the filter type', () => {
    const onlineRightNowFilter: IRealtimeOnlineFilterPart = { on: FilterPartTypeEnum.IS_ONLINE, value: true };
    const onlineInLastFilter: IOnlineInLastFilterPart = {
      on: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
      timeOperator: TimeOperatorEnum.HOURS,
      value: 5,
    };
    const webhookFilter: IWebhookFilterPart = {
      field: 'test-field',
      on: FilterPartTypeEnum.WEBHOOK,
      operator: 'EQUAL',
      value: 'test',
      webhookUrl: 'test-url',
    };
    const fieldFilters: IFieldFilterPart = {
      field: 'test-field',
      on: FilterPartTypeEnum.PAYLOAD,
      operator: 'IN',
      value: 'test-value',
    };

    expect(getFilterLabel(onlineRightNowFilter, [])).to.equal('is online right now equal');
    expect(getFilterLabel(onlineInLastFilter, [])).to.equal(
      `online in the last "X" ${onlineInLastFilter.timeOperator}`
    );
    expect(getFilterLabel(webhookFilter, [])).to.equal('webhook test-field equal');
    expect(getFilterLabel(fieldFilters, [])).to.equal('payload test-field includes');
  });
});
