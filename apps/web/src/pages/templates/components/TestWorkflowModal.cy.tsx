import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TriggerTypeEnum } from '@novu/shared';

import { TestWrapper } from '../../../testing';
import { TestWorkflow } from './TestWorkflow';

const queryClient = new QueryClient();

describe('TestWorkflowModal Component', function () {
  it('should display subscriberId and empty json values when there are no variables', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflow />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains(`"subscriberId": "<REPLACE_WITH_DATA>"`);
    cy.getByTestId('test-trigger-payload-param').contains(`{ }`);
    cy.getByTestId('test-trigger-overrides-param').contains(`{ }`);
  });

  it('should add variables and subscriber variables to input fields', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflow />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains(`"subscriberId": "<REPLACE_WITH_DATA>",`);
    cy.getByTestId('test-trigger-to-param').contains(`"email": "<REPLACE_WITH_DATA>"`);
    cy.getByTestId('test-trigger-payload-param').contains(`"firstVariable": "<REPLACE_WITH_DATA>",`);
    cy.getByTestId('test-trigger-payload-param').contains(`"secondVariable": "<REPLACE_WITH_DATA>"`);
    cy.getByTestId('test-trigger-overrides-param').contains(`{ }`);
  });
});
