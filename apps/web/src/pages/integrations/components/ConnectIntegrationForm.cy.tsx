import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChannelTypeEnum, CredentialsKeyEnum, EmailProviderIdEnum } from '@novu/shared';

import { ConnectIntegrationForm } from './ConnectIntegrationForm';
import { TestWrapper } from '../../../testing';
import type { IIntegratedProvider } from '../types';

const exampleProvider: IIntegratedProvider = {
  providerId: EmailProviderIdEnum.EmailJS,
  active: false,
  channel: ChannelTypeEnum.EMAIL,
  betaVersion: false,
  comingSoon: false,
  connected: false,
  credentials: [],
  displayName: 'Email.js',
  docReference: 'https://www.emailjs.com/docs',
  logoFileName: { light: 'emailjs.svg', dark: 'emailjs.svg' },
  integrationId: '',
  primary: false,
};

const defaultProps: {
  provider: IIntegratedProvider;
  showModal: (visible: boolean) => void;
  createModel: boolean;
  onClose: () => void;
} = { provider: exampleProvider, showModal: () => {}, onClose: () => {}, createModel: false };

const queryClient = new QueryClient();

it('displays the correct button text', () => {
  cy.mount(
    <QueryClientProvider client={queryClient}>
      <TestWrapper>
        <ConnectIntegrationForm {...defaultProps} createModel={true} />
      </TestWrapper>
    </QueryClientProvider>
  );

  cy.get('button[type="submit"]').should('contain.text', 'Connect');

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <TestWrapper>
        <ConnectIntegrationForm {...defaultProps} createModel={false} />
      </TestWrapper>
    </QueryClientProvider>
  );

  cy.get('button[type="submit"]').should('contain.text', 'Update');
});

it('close button calls onClose', () => {
  const onCloseStub = cy.stub();

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <TestWrapper>
        <ConnectIntegrationForm {...defaultProps} onClose={onCloseStub} />
      </TestWrapper>
    </QueryClientProvider>
  );

  // eslint-disable-next-line cypress/unsafe-to-chain-command
  cy.get('[data-test-id="connection-integration-form-close"]')
    .should('have.attr', 'type', 'button')
    .click()
    .then((e) => {
      expect(onCloseStub).to.be.called;

      return e;
    });
});

it('shows the configuration for the selected provider', () => {
  const credentials = [
    {
      key: CredentialsKeyEnum.ApiKey,
      displayName: 'API Key',
      type: 'string',
      required: true,
    },
    {
      key: CredentialsKeyEnum.SecretKey,
      displayName: 'API Secret',
      type: 'string',
      required: true,
    },
    {
      key: CredentialsKeyEnum.RequireTls,
      displayName: 'Require Tls',
      type: 'switch',
      required: true,
    },
  ];

  const provider: IIntegratedProvider = {
    ...exampleProvider,
    credentials,
  };

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <TestWrapper>
        <ConnectIntegrationForm {...defaultProps} provider={provider} />
      </TestWrapper>
    </QueryClientProvider>
  );

  cy.get(`img[alt="emailjs image"]`)
    .then((e) => e.attr('src'))
    .should('match', /.*emailjs\.svg$/);
  cy.get('a').should('have.text', 'our guide').and('have.attr', 'href', 'https://www.emailjs.com/docs');

  // We may use a for-loop here since order of checks is not important
  for (const cred of credentials) {
    if (cred.key === CredentialsKeyEnum.RequireTls)
      cy.get(`input[name="${cred.key}"]`).should('have.attr', 'type', 'checkbox');
    else cy.get(`input[name="${cred.key}"]`).should('have.attr', 'placeholder', cred.displayName);
  }

  cy.get('[data-test-id="connect-integration-form-active-text"]').should('have.text', 'Disabled');
});
