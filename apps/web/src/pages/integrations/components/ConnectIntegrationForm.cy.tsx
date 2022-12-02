import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter as Router } from 'react-router-dom';
import { CredentialsKeyEnum, ChannelTypeEnum } from '@novu/shared';
import { ConnectIntegrationForm } from './ConnectIntegrationForm';
import { TestWrapper } from '../../../testing';
import { IIntegratedProvider } from '../IntegrationsStorePage';

const exampleProvider: IIntegratedProvider = {
  providerId: 'emailjs',
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
};

const defaultProps: {
  provider: IIntegratedProvider | null;
  showModal: (visible: boolean) => void;
  createModel: boolean;
  onClose: () => void;
} = { provider: null, showModal: () => {}, onClose: () => {}, createModel: false };

const queryClient = new QueryClient();

it('displays the correct button text', () => {
  cy.mount(
    <Router>
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ConnectIntegrationForm {...defaultProps} createModel={true} />
        </TestWrapper>
      </QueryClientProvider>
    </Router>
  );

  cy.get('button[type="submit"]').should('contain.text', 'Connect');

  cy.mount(
    <Router>
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ConnectIntegrationForm {...defaultProps} createModel={false} />
        </TestWrapper>
      </QueryClientProvider>
    </Router>
  );

  cy.get('button[type="submit"]').should('contain.text', 'Update');
});

it('close button calls onClose', () => {
  const onCloseStub = cy.stub();

  cy.mount(
    <Router>
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ConnectIntegrationForm {...defaultProps} onClose={onCloseStub} />
        </TestWrapper>
      </QueryClientProvider>
    </Router>
  );

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
  ];

  const provider: IIntegratedProvider = {
    ...exampleProvider,
    credentials,
  };

  cy.mount(
    <Router>
      <QueryClientProvider client={queryClient}>
        <TestWrapper>
          <ConnectIntegrationForm {...defaultProps} provider={provider} />
        </TestWrapper>
      </QueryClientProvider>
    </Router>
  );

  cy.get(`img[alt="emailjs image"]`)
    .then((e) => e.attr('src'))
    .should('match', /.*emailjs\.svg$/);
  cy.get('a').should('have.text', 'here.').and('have.attr', 'href', 'https://www.emailjs.com/docs');

  // We may use a for-loop here since order of checks is not important
  for (const cred of credentials) {
    cy.get(`input[name="${cred.key}"]`).should('have.attr', 'placeholder', cred.displayName);
  }

  cy.get('[data-test-id="connect-integration-form-active-text"]').should('have.text', 'Disabled');
});
