import { TestWrapper } from '../../../testing';
import { ProviderCard } from './ProviderCard';
import { ChannelTypeEnum, CredentialsKeyEnum, EmailProviderIdEnum } from '@novu/shared';
import { ColorSchemeProvider } from '@mantine/core';

const providerCardTestId = 'integration-provider-card-sendgrid';

const provider = {
  providerId: EmailProviderIdEnum.SendGrid,
  integrationId: 'integration.id',
  displayName: 'providerItem.displayName',
  channel: ChannelTypeEnum.EMAIL,
  credentials: [
    {
      key: CredentialsKeyEnum.ApiKey,
      displayName: 'API Key',
      type: 'string',
      required: true,
    },
    {
      key: CredentialsKeyEnum.SecretKey,
      displayName: 'Secret key',
      type: 'string',
      required: true,
    },
  ],
  docReference: 'providerItem.docReference',
  comingSoon: false,
  betaVersion: false,
  active: false,
  connected: false,
  logoFileName: { light: 'examplelight.svg', dark: 'exampledark.svg' },
  primary: false,
};

it('should change the image based on the colorScheme (light) selected by user', () => {
  const colorScheme = 'light';

  cy.mount(
    <TestWrapper>
      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={() => {}}>
        <ProviderCard provider={provider} onConnectClick={() => {}} />
      </ColorSchemeProvider>
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId)
    .find('img')
    .should('have.attr', 'src', `/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`)
    .should('have.attr', 'alt', provider.displayName);
});

it('should change the image based on the colorScheme (dark) selected by user', () => {
  const colorScheme = 'dark';

  cy.mount(
    <TestWrapper>
      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={() => {}}>
        <ProviderCard provider={provider} onConnectClick={() => {}} />
      </ColorSchemeProvider>
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId)
    .find('img')
    .should('have.attr', 'src', `/static/images/providers/${colorScheme}/${provider.logoFileName[`${colorScheme}`]}`)
    .should('have.attr', 'alt', provider.displayName);
});

it('should show a connected state when the provider is configured', () => {
  const onClickSpy = cy.spy().as('clickSpy');
  const connectedProvider = { ...provider, connected: true };

  cy.mount(
    <TestWrapper>
      <ProviderCard provider={connectedProvider} onConnectClick={onClickSpy} />
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId).click();
  cy.get('@clickSpy').its('callCount').should('equal', 1);
  cy.get('@clickSpy').should('have.been.calledWith', true, false, connectedProvider);

  cy.getByTestId(providerCardTestId).should('not.contain', 'COMING SOON').should('not.contain', 'BETA');
  cy.getByTestId(providerCardTestId).get('button').should('not.be.exist');
  cy.getByTestId('provider-card-settings-svg').should('exist');
  cy.getByTestId('card-status-bar-active').should('exist');
});

it('should show the default state when not connected', () => {
  const onClickSpy = cy.spy().as('clickSpy');

  cy.mount(
    <TestWrapper>
      <ProviderCard provider={provider} onConnectClick={onClickSpy} />
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId).click();
  cy.get('@clickSpy').its('callCount').should('equal', 1);
  cy.get('@clickSpy').should('have.been.calledWith', true, true, provider);

  cy.getByTestId(providerCardTestId).should('not.contain', 'COMING SOON').should('not.contain', 'BETA');
  cy.getByTestId(providerCardTestId).get('button').should('exist').should('not.have.attr', 'disabled');
  cy.getByTestId('provider-card-settings-svg').should('not.be.exist');
  cy.getByTestId('card-status-bar-active').should('not.be.exist');
});

it('should display a coming soon banner when applied', () => {
  const onClickSpy = cy.spy().as('clickSpy');
  const comingSoonProvider = { ...provider, comingSoon: true };
  const colorScheme = 'light';

  cy.mount(
    <TestWrapper>
      <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={() => {}}>
        <ProviderCard provider={comingSoonProvider} onConnectClick={onClickSpy} />
      </ColorSchemeProvider>
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId).click();
  cy.get('@clickSpy').should('not.have.been.calledWith');

  cy.getByTestId(providerCardTestId).should('contain', 'COMING SOON').should('not.contain', 'BETA');
  cy.getByTestId(providerCardTestId).get('button').should('exist').should('have.attr', 'disabled');
  cy.getByTestId('card-status-bar-active').should('not.be.exist');
});

it('should display the beta version banner when in beta', () => {
  const betaVersionProvider = { ...provider, connected: true, betaVersion: true };

  cy.mount(
    <TestWrapper>
      <ProviderCard provider={betaVersionProvider} onConnectClick={() => {}} />
    </TestWrapper>
  );

  cy.getByTestId(providerCardTestId).should('not.contain', 'COMING SOON').should('contain', 'BETA');
  cy.getByTestId('provider-card-settings-svg').should('not.be.exist');
});
