import { TestWrapper } from '../../../testing';
import { BrowserRouter as Router } from 'react-router-dom';
import { BlueprintModal } from './BlueprintModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({});

describe('Blueprint Modal', () => {
  it('should render and create template from blueprint', () => {
    window.localStorage.setItem('blueprintId', 'test');

    cy.intercept('GET', '/v1/notification-templates/test/blueprint', {
      body: {
        data: {
          name: 'test name',
          description: 'test description',
        },
      },
    }).as('getTemplate');

    cy.intercept('POST', `/v1/notification-templates/test/blueprint`, {
      body: {
        _id: 'test',
      },
    }).as('createTemplate');

    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <Router>
            <BlueprintModal />
          </Router>
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.wait('@getTemplate');
    cy.get("[data-test-id='blueprint-description']").contains('test description');
    cy.get("[data-test-id='blueprint-name']").contains('test name');
    cy.get("[data-test-id='create-from-blueprint']").click();
    cy.wait('@createTemplate');
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.getAllLocalStorage().should('deep.equal', {});
  });

  it('should render and remove blueprintId on close', () => {
    window.localStorage.setItem('blueprintId', 'test');

    cy.intercept('GET', '/v1/notification-templates/test/blueprint', {
      body: {
        data: {
          name: 'test name',
          description: 'test description',
        },
      },
    }).as('getTemplate');

    cy.mount(
      <TestWrapper>
        <QueryClientProvider client={queryClient}>
          <Router>
            <BlueprintModal />
          </Router>
        </QueryClientProvider>
      </TestWrapper>
    );
    cy.wait('@getTemplate');
    cy.get('.mantine-Modal-close').click();
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.getAllLocalStorage().should('deep.equal', {});
  });
});
