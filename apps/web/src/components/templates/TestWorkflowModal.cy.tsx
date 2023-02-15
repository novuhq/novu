import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TriggerTypeEnum } from '@novu/shared';

import { TestWrapper } from '../../testing';
import { TestWorkflowModal } from './TestWorkflowModal';

const queryClient = new QueryClient();

describe('TestWorkflowModal Component', function () {
  it('should display subscriberId and empty json values when there are no variables', function () {
    const trigger = { variables: [], type: TriggerTypeEnum.EVENT, identifier: '1234', subscriberVariables: [] };

    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflowModal
            isVisible={true}
            onDismiss={() => {}}
            setTransactionId={() => {}}
            openExecutionModal={() => {}}
            template={{
              name: '1234',
              _notificationGroupId: '',
              _environmentId: '',
              tags: [],
              draft: false,
              active: true,
              critical: false,
              preferenceSettings: {},
              steps: [
                {
                  metadata: {
                    delayPath: 'sendAt',
                  },
                },
              ],
              triggers: [trigger],
            }}
          />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.getByTestId('test-trigger-to-param').contains(`"subscriberId": "<REPLACE_WITH_DATA>"`);
    cy.getByTestId('test-trigger-payload-param').contains(`{}`);
    cy.getByTestId('test-trigger-overrides-param').contains(`{ }`);
  });

  it('should add variables and subscriber variables to input fields', function () {
    const trigger = {
      variables: [{ name: 'firstVariable' }, { name: 'secondVariable' }],
      type: TriggerTypeEnum.EVENT,
      identifier: '1234',
      subscriberVariables: [{ name: 'email' }],
    };

    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <TestWorkflowModal
            isVisible={true}
            onDismiss={() => {}}
            openExecutionModal={() => {}}
            setTransactionId={() => {}}
            template={{
              name: '1234',
              _notificationGroupId: '',
              _environmentId: '',
              tags: [],
              draft: false,
              active: true,
              critical: false,
              preferenceSettings: {},
              steps: [
                {
                  metadata: {
                    delayPath: 'sendAt',
                  },
                },
              ],
              triggers: [trigger],
            }}
          />
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
