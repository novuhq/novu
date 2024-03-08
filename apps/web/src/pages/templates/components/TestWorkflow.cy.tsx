import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TestWrapper } from '../../../testing';
import { TestWorkflow } from './TestWorkflow';
import { TriggerTypeEnum } from '@novu/shared';
import { FormProvider, useForm } from 'react-hook-form';

const queryClient = new QueryClient();

const FormProviderWrapper = ({ children }) => {
  const methods = useForm();

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('TestWorkflow Component', function () {
  it('should display subscriberId and empty json values when there are no variables', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <FormProviderWrapper>
          <TestWrapper>
            <TestWorkflow
              trigger={{ variables: [], type: TriggerTypeEnum.EVENT, identifier: '1234', subscriberVariables: [] }}
            />
          </TestWrapper>
        </FormProviderWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains('"subscriberId": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-payload-param').contains('{ }');
    cy.getByTestId('test-trigger-overrides-param').contains('{ }');
  });

  it('should add variables and subscriber variables to input fields', function () {
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <FormProviderWrapper>
          <TestWrapper>
            <TestWorkflow
              trigger={{
                variables: [{ name: 'firstVariable' }, { name: 'secondVariable' }],
                type: TriggerTypeEnum.EVENT,
                identifier: '1234',
                subscriberVariables: [{ name: 'email' }],
              }}
            />
          </TestWrapper>
        </FormProviderWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains('"subscriberId": "<REPLACE_WITH_DATA>",');
    cy.getByTestId('test-trigger-to-param').contains('"email": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-payload-param').contains('"firstVariable": "<REPLACE_WITH_DATA>",');
    cy.getByTestId('test-trigger-payload-param').contains('"secondVariable": "<REPLACE_WITH_DATA>"');
    cy.getByTestId('test-trigger-overrides-param').contains('{ }');
  });
});
