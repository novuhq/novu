import { ApiKeysCard } from '.';
import { TestWrapper } from '../../../testing';
import { QueryClient, QueryClientProvider } from 'react-query';
import { IEnvironment } from '@novu/shared';

const myEnvironments: IEnvironment = {
  _id: '633a68831c6bf8ce582c923e',
  name: 'test',
  _organizationId: '633a68831c6bf8ce582c9238',
  identifier: '38rTyAK2BJ7Z',

  widget: {
    notificationCenterEncryption: false,
  },
};

const currentEnvironment = {
  createdAt: '2022-10-03T04:43:47.460Z',
  id: '633a68831c6bf8ce582c923e',
  identifier: '38rTyAK2BJ7Z',
  name: 'Development',
  updatedAt: '2022-10-03T04:43:47.460Z',
  widget: {
    notificationCenterEncryption: false,
  },
  __v: 0,
  _id: '633a68831c6bf8ce582c923e',
  _organizationId: '633a68831c6bf8ce582c9238',
};

const apiKeys: { key: string }[] = [
  {
    key: 'f9859f757bd8f682a04cd92f3e228eaa',
  },
];

const queryClient = new QueryClient();

describe('Input Component', () => {
  beforeEach(() => {
    cy.intercept('GET', '/v1/environments/api-keys', {
      body: {
        data: apiKeys,
      },
    }).as('getApiKeys');
    cy.intercept('GET', '/v1/environments/me', {
      body: {
        data: currentEnvironment,
      },
    }).as('currentEnvironment');
    cy.intercept('GET', 'v1/environments', {
      body: {
        data: [myEnvironments],
      },
    }).as('myEnvironments');
    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ApiKeysCard />
        </TestWrapper>
      </QueryClientProvider>
    );
  });

  it('should render Api Key and Application Identifier in each input form', () => {
    cy.wait('@getApiKeys');
    cy.get("[data-test-id='api-key-container']").should('have.value', apiKeys[0].key);
    cy.wait('@currentEnvironment');
    cy.get("[data-test-id='api-identifier']").should('have.value', currentEnvironment.identifier);
  });

  it('should copy Api Key and Application Identifier to the clipboard', () => {
    cy.wait('@getApiKeys');
    cy.get("[data-test-id='api-key-Tooltip']").click();
    cy.window().its('navigator.clipboard').invoke('readText').should('equal', apiKeys[0].key);

    cy.wait('@currentEnvironment');
    cy.get("[data-test-id='api-identifier-Tooltip']").click();
    cy.window().its('navigator.clipboard').invoke('readText').should('equal', currentEnvironment.identifier);
  });
});
