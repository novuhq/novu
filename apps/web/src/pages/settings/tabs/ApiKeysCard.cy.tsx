import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IEnvironment } from '@novu/shared';

import { ApiKeysCard } from '.';
import { TestWrapper } from '../../../testing';

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

const regenerateApiKeys: { key: string }[] = [
  {
    key: 'b34e0a6e117da332106d9173e1dd043c',
  },
];

const queryClient = new QueryClient();

const renderComponent = () => {
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
};

describe('Input Component', () => {
  beforeEach(renderComponent);

  it('should render Api Key and Application Identifier in each input form', () => {
    cy.get("[data-test-id='api-key-container']").should('have.value', apiKeys[0].key);
    cy.get("[data-test-id='api-identifier']").should('have.value', currentEnvironment.identifier);
  });

  it('should copy Api Key and Application Identifier to the clipboard', () => {
    cy.window().then((win) => {
      cy.spy(win.navigator.clipboard, 'writeText').as('copy');

      return;
    });
    cy.get("[data-test-id='api-key-copy']").click();
    cy.get('@copy').should('be.calledWithExactly', apiKeys[0].key);

    cy.get("[data-test-id='application-identifier-copy']").click();
    cy.get('@copy').should('be.calledWithExactly', currentEnvironment.identifier);
  });
});

describe('Regenerate Keys', () => {
  beforeEach(renderComponent);

  it('should open modals', () => {
    cy.get("[data-test-id='show-regenerate-api-key-modal']").click();
    cy.get("[data-test-id='regenerate-api-key-modal']").should('be.visible');
  });

  it('should regenerate an api key and update api key in the input field', () => {
    cy.get("[data-test-id='show-regenerate-api-key-modal']").click();
    cy.intercept('POST', '/v1/environments/api-keys/regenerate', {
      body: {
        data: regenerateApiKeys,
      },
    }).as('regenerateApiKeysConfirmAction');
    cy.get("[data-test-id='regenerate-api-key-modal-button']").click();
    cy.wait('@regenerateApiKeysConfirmAction');

    cy.intercept('GET', '/v1/environments/api-keys', {
      body: {
        data: regenerateApiKeys,
      },
    }).as('getRegeneratedApiKeys');

    cy.mount(
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ApiKeysCard />
        </TestWrapper>
      </QueryClientProvider>
    );

    cy.wait('@getRegeneratedApiKeys');
    cy.get("[data-test-id='api-key-container']").should('have.value', regenerateApiKeys[0].key);
  });
});
