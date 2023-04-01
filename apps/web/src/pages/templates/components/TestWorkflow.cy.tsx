import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TestWrapper } from '../../../testing';
import { TestWorkflow } from './TestWorkflow';
import { BrowserRouter } from 'react-router-dom';
import { CONTEXT_PATH } from '../../../config';

const queryClient = new QueryClient();

describe('TestWorkflow Component', function () {
  it('should display subscriberId and empty json values when there are no variables', function () {
    cy.mount(
      <BrowserRouter basename={CONTEXT_PATH}>
        <QueryClientProvider client={queryClient}>
          <TestWrapper>
            <TestWorkflow />
          </TestWrapper>
        </QueryClientProvider>
      </BrowserRouter>
    );

    cy.getByTestId('test-trigger-to-param').contains('"subscriberId": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-payload-param').contains('{ }');
    cy.getByTestId('test-trigger-overrides-param').contains('{ }');
  });

  it.skip('should add variables and subscriber variables to input fields', function () {
    cy.mount(
      <BrowserRouter basename={CONTEXT_PATH}>
        <QueryClientProvider client={queryClient}>
          <TestWrapper>
            <TestWorkflow />
          </TestWrapper>
        </QueryClientProvider>
      </BrowserRouter>
    );

    cy.getByTestId('test-trigger-to-param').contains('"subscriberId": "<REPLACE_WITH_DATA>",');
    cy.getByTestId('test-trigger-to-param').contains('"email": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-payload-param').contains('"firstVariable": "<REPLACE_WITH_DATA>",');
    cy.getByTestId('test-trigger-payload-param').contains('"secondVariable": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-overrides-param').contains('{ }');
  });
});
