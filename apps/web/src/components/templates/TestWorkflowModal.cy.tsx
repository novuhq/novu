import { TriggerTypeEnum } from '@novu/shared';
import { TestWrapper } from '../../testing';
import { TestWorkflowModal } from './TestWorkflowModal';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

describe('TestWorkflowModal Component', function () {
  it('should display subscriberId and empty json values when there are no variables', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflowModal
            isVisible={true}
            onDismiss={() => {}}
            setTransactionId={() => {}}
            openExecutionModal={() => {}}
            trigger={{ variables: [], type: TriggerTypeEnum.EVENT, identifier: '1234', subscriberVariables: [] }}
          />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains(`"subscriberId": "REPLACE_WITH_DATA"`);
    cy.getByTestId('test-trigger-payload-param').contains(`{ }`);
    cy.getByTestId('test-trigger-overrides-param').contains(`{ }`);
  });

  it('should add variables and subscriber variables to input fields', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflowModal
            isVisible={true}
            onDismiss={() => {}}
            openExecutionModal={() => {}}
            setTransactionId={() => {}}
            trigger={{
              variables: [{ name: 'firstVariable' }, { name: 'secondVariable' }],
              type: TriggerTypeEnum.EVENT,
              identifier: '1234',
              subscriberVariables: [{ name: 'email' }],
            }}
          />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains(`"subscriberId": "REPLACE_WITH_DATA",`);
    cy.getByTestId('test-trigger-to-param').contains(`"email": "REPLACE_WITH_DATA"`);
    cy.getByTestId('test-trigger-payload-param').contains(`"firstVariable": "REPLACE_WITH_DATA",`);
    cy.getByTestId('test-trigger-payload-param').contains(`"secondVariable": "REPLACE_WITH_DATA"`);
    cy.getByTestId('test-trigger-overrides-param').contains(`{ }`);
  });
});
