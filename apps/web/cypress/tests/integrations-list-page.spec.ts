// @ts-nocheck
import {
  inAppProviders,
  emailProviders,
  chatProviders,
  pushProviders,
  smsProviders,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ChannelTypeEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

Cypress.on('window:before:load', (win) => {
  win._cypress = {
    ...win._cypress,
  };
  win.isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
});

/**
 * The tests from this file were moved to the corresponding Playwright file apps/web/tests/integrations-list-page.spec.ts.
 * @deprecated
 */
describe.skip('Integrations List Page', function () {
  let session: any;

  beforeEach(function () {
    cy.initializeSession()
      .then((result) => {
        session = result;
      })
      .as('session');
  });

  const interceptIntegrationRequests = () => {
    cy.intercept('GET', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');
  };

  const checkTableLoading = () => {
    cy.getByTestId('integration-name-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-provider-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-channel-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-environment-cell-loading').should('have.length', 10).first().should('be.visible');
    cy.getByTestId('integration-status-cell-loading').should('have.length', 10).first().should('be.visible');
  };

  const checkTableRow = (
    {
      name,
      isFree,
      provider,
      channel,
      environment,
      status,
      conditions,
    }: {
      name: string;
      isFree?: boolean;
      provider: string;
      channel: string;
      environment?: string;
      status: string;
      conditions?: number;
    },
    nth: number
  ) => {
    cy.getByTestId('integrations-list-table').as('integrations-table');
    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-name-cell')
      .should('be.visible')
      .contains(name);

    if (isFree) {
      cy.get('@integrations-table')
        .get('tr')
        .eq(nth)
        .getByTestId('integration-name-cell')
        .should('be.visible')
        .contains('Test Provider');
    }

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-provider-cell')
      .should('be.visible')
      .contains(provider);

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-channel-cell')
      .should('be.visible')
      .contains(channel);

    if (environment) {
      cy.get('@integrations-table')
        .get('tr')
        .eq(nth)
        .getByTestId('integration-environment-cell')
        .should('be.visible')
        .contains(environment);
    }
    if (conditions) {
      cy.get('@integrations-table')
        .get('tr')
        .eq(nth)
        .getByTestId('integration-conditions-cell')
        .should('be.visible')
        .contains(conditions);
    }

    cy.get('@integrations-table')
      .get('tr')
      .eq(nth)
      .getByTestId('integration-status-cell')
      .should('be.visible')
      .contains(status);
  };

  const clickOnListRow = (name: string) => {
    cy.getByTestId('integrations-list-table').as('integrations-table');
    cy.get('@integrations-table')
      .get('tr')
      .getByTestId('integration-name-cell')
      .should('be.visible')
      .contains(name)
      .click();
  };

  it('should show the table loading skeleton and empty state', () => {
    cy.intercept('*/integrations', {
      data: [],
      delay: 1000,
    }).as('getIntegrations');
    cy.intercept('*/environments', async () => {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }).as('getEnvironments');

    cy.visit('/integrations');
    cy.location('pathname').should('equal', '/integrations');

    checkTableLoading();

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('no-integrations-placeholder').should('be.visible');
    cy.contains('Choose a channel you want to start sending notifications');

    cy.getByTestId('integration-channel-card-in_app').should('be.enabled').contains('In-App');
    cy.getByTestId('integration-channel-card-email').should('be.enabled').contains('Email');
    cy.getByTestId('integration-channel-card-chat').should('be.enabled').contains('Chat');
    cy.getByTestId('integration-channel-card-push').should('be.enabled').contains('Push');
    cy.getByTestId('integration-channel-card-sms').should('be.enabled').contains('SMS');
  });

  it('should show the table loading skeleton and then table', function () {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');

    cy.visit('/integrations');
    cy.location('pathname').should('equal', '/integrations');

    checkTableLoading();

    cy.wait('@getIntegrations');
    cy.getByTestId('add-provider').should('be.enabled').contains('Add a provider');

    checkTableRow(
      {
        name: 'SendGrid',
        provider: 'SendGrid',
        channel: 'Email',
        environment: 'Development',
        status: 'Active',
      },
      0
    );
    checkTableRow(
      {
        name: 'Twilio',
        provider: 'Twilio',
        channel: 'SMS',
        environment: 'Development',
        status: 'Active',
      },
      1
    );
    checkTableRow(
      {
        name: 'Slack',
        provider: 'Slack',
        channel: 'Chat',
        environment: 'Development',
        status: 'Active',
      },
      2
    );
    checkTableRow(
      {
        name: 'Discord',
        provider: 'Discord',
        channel: 'Chat',
        environment: 'Development',
        status: 'Active',
      },
      3
    );
    checkTableRow(
      {
        name: 'Firebase Cloud Messaging',
        provider: 'Firebase Cloud Messaging',
        channel: 'Push',
        environment: 'Development',
        status: 'Active',
      },
      4
    );
    checkTableRow(
      {
        name: 'Novu In-App',
        isFree: false,
        provider: 'Novu In-App',
        channel: 'In-App',
        environment: 'Development',
        status: 'Active',
      },
      5
    );
    /*
    checkTableRow(
      {
        name: 'SendGrid',
        provider: 'SendGrid',
        channel: 'Email',
        environment: 'Production',
        status: 'Active',
      },
      6
    );
    checkTableRow(
      {
        name: 'Twilio',
        provider: 'Twilio',
        channel: 'SMS',
        environment: 'Production',
        status: 'Active',
      },
      7
    );
    checkTableRow(
      {
        name: 'Slack',
        provider: 'Slack',
        channel: 'Chat',
        environment: 'Production',
        status: 'Active',
      },
      8
    );
    checkTableRow(
      {
        name: 'Discord',
        provider: 'Discord',
        channel: 'Chat',
        environment: 'Production',
        status: 'Active',
      },
      9
    );
    checkTableRow(
      {
        name: 'Firebase Cloud Messaging',
        provider: 'Firebase Cloud Messaging',
        channel: 'Push',
        environment: 'Production',
        status: 'Active',
      },
      10
    );
    checkTableRow(
      {
        name: 'Novu In-App',
        isFree: true,
        provider: 'Novu In-App',
        channel: 'In-App',
        environment: 'Production',
        status: 'Active',
      },
      11
    );
    checkTableRow(
      {
        name: 'Novu Email',
        provider: 'Novu Email',
        channel: 'Email',
        status: 'Disabled',
      },
      12
    );
    checkTableRow(
      {
        name: 'Novu SMS',
        provider: 'Novu SMS',
        channel: 'SMS',
        status: 'Disabled',
      },
      13
    );
    */
  });

  it('should show the select provider sidebar', () => {
    cy.task('deleteProvider', {
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      environmentId: session.environment.id,
      organizationId: session.organization.id,
    }).then(() => {
      cy.intercept('*/integrations', async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }).as('getIntegrations');
      cy.intercept('*/environments').as('getEnvironments');

      cy.visit('/integrations');
      cy.location('pathname').should('equal', '/integrations');

      cy.wait('@getIntegrations');
      cy.wait('@getEnvironments');

      cy.getByTestId('add-provider').should('be.enabled').contains('Add a provider').click();

      cy.location('pathname').should('equal', '/integrations/create');
      cy.getByTestId('select-provider-sidebar').should('be.visible').as('selectProviderSidebar');

      cy.get('@selectProviderSidebar').getByTestId('sidebar-close').should('be.visible');
      cy.get('@selectProviderSidebar').contains('Select a provider');
      cy.get('@selectProviderSidebar').contains('Select a provider to create instance for a channel');
      cy.get('@selectProviderSidebar')
        .find('input[type="search"]')
        .should('have.attr', 'placeholder', 'Search a provider...');

      cy.get('@selectProviderSidebar').find('[role="tablist"]').as('channelTabs');
      cy.get('@channelTabs').find('[data-active="true"]').contains('In-App');
      cy.get('@channelTabs').contains('In-App');
      cy.get('@channelTabs').contains('Email');
      cy.get('@channelTabs').contains('Chat');
      cy.get('@channelTabs').contains('Push');
      cy.get('@channelTabs').contains('SMS');

      cy.getByTestId('providers-group-in_app').contains('In-App').as('inAppGroup');
      cy.getByTestId('providers-group-email').contains('Email').as('emailGroup');
      cy.getByTestId('providers-group-chat').contains('Chat').as('chatGroup');
      cy.getByTestId('providers-group-push').contains('Push').as('pushGroup');
      cy.getByTestId('providers-group-sms').contains('SMS').as('smsGroup');

      inAppProviders.forEach((provider) => {
        cy.get('@inAppGroup').getByTestId(`provider-${provider.id}`).contains(provider.displayName);
      });
      emailProviders
        .filter((provider) => provider.id !== EmailProviderIdEnum.Novu)
        .forEach((provider) => {
          cy.get('@emailGroup').getByTestId(`provider-${provider.id}`).contains(provider.displayName);
        });
      chatProviders.forEach((provider) => {
        cy.get('@chatGroup').getByTestId(`provider-${provider.id}`).contains(provider.displayName);
      });
      pushProviders.forEach((provider) => {
        cy.get('@pushGroup').getByTestId(`provider-${provider.id}`).contains(provider.displayName);
      });
      smsProviders
        .filter((provider) => provider.id !== SmsProviderIdEnum.Novu)
        .forEach((provider) => {
          cy.get('@smsGroup').getByTestId(`provider-${provider.id}`).contains(provider.displayName);
        });

      cy.getByTestId('select-provider-sidebar-cancel').contains('Cancel');
      cy.getByTestId('select-provider-sidebar-next').should('be.disabled').contains('Next');
    });
  });

  it('should allow for searching', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.getByTestId('select-provider-sidebar').should('be.visible').as('selectProviderSidebar');

    cy.get('@selectProviderSidebar').find('input[type="search"]').type('Mail');

    cy.getByTestId('select-provider-sidebar').find('[role="tablist"]').as('channelTabs');
    cy.get('@channelTabs').contains('In-App').should('not.be.visible');
    cy.get('@channelTabs').contains('Email').should('be.visible');
    cy.get('@channelTabs').contains('Chat').should('not.be.visible');
    cy.get('@channelTabs').contains('Push').should('not.be.visible');
    cy.get('@channelTabs').contains('SMS').should('not.be.visible');

    cy.getByTestId('providers-group-email').contains('Email').as('emailGroup');
    cy.get('@emailGroup').getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet');
    cy.get('@emailGroup').getByTestId(`provider-${EmailProviderIdEnum.Mailgun}`).contains('Mailgun');
    cy.get('@emailGroup').getByTestId(`provider-${EmailProviderIdEnum.MailerSend}`).contains('MailerSend');
    cy.get('@emailGroup').getByTestId(`provider-${EmailProviderIdEnum.EmailWebhook}`).contains('Email Webhook');
    cy.getByTestId('select-provider-sidebar-next').should('be.disabled').contains('Next');
  });

  it('should show empty search results', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.getByTestId('select-provider-sidebar').should('be.visible').as('selectProviderSidebar');

    cy.get('@selectProviderSidebar').find('input[type="search"]').type('safasdfasdfasdfasdfas');

    cy.getByTestId('providers-group-in_app').should('not.exist');
    cy.getByTestId('providers-group-email').should('not.exist');
    cy.getByTestId('providers-group-chat').should('not.exist');
    cy.getByTestId('providers-group-push').should('not.exist');
    cy.getByTestId('providers-group-sms').should('not.exist');

    cy.getByTestId('select-provider-no-search-results-img').should('be.visible');
    cy.getByTestId('select-provider-sidebar-next').should('be.disabled').contains('Next');
  });

  it('should allow selecting a provider', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();

    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).should(
          'have.attr',
          'src',
          `/static/images/providers/dark/square/${EmailProviderIdEnum.Mailjet}.svg`
        );
        return;
      }

      cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).should(
        'have.attr',
        'src',
        `/static/images/providers/light/square/${EmailProviderIdEnum.Mailjet}.svg`
      );
    });
    cy.getByTestId('selected-provider-name').should('be.visible').contains('Mailjet');

    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next');
  });

  it('should allow moving to create sidebar', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('create-provider-instance-sidebar')
      .should('be.visible')
      .contains('Specify assignment preferences to automatically allocate the provider instance to the Email channel.');
    cy.getByTestId('create-provider-instance-sidebar-back').should('be.visible');
    cy.getByTestId('sidebar-close').should('be.visible');
    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).should(
          'have.attr',
          'src',
          `/static/images/providers/dark/square/${EmailProviderIdEnum.Mailjet}.svg`
        );
        return;
      }

      cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Mailjet}`).should(
        'have.attr',
        'src',
        `/static/images/providers/light/square/${EmailProviderIdEnum.Mailjet}.svg`
      );
    });
    cy.getByTestId('provider-instance-name').should('be.visible').should('have.value', 'Mailjet');
    cy.getByTestId('create-provider-instance-sidebar').contains('Environment');
    cy.getByTestId('create-provider-instance-sidebar').contains('Provider instance executes only for');
    cy.getByTestId('create-provider-instance-sidebar').find('[role="radiogroup"]').as('environmentRadios');
    cy.get('@environmentRadios').find('[data-checked="true"]').contains('Development');
    cy.get('@environmentRadios').contains('Production');
    cy.getByTestId('create-provider-instance-sidebar-cancel').should('not.be.disabled').contains('Cancel');
    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create');
  });

  it('should allow moving back from create provider sidebar to select provider sidebar', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();
    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');

    cy.getByTestId('create-provider-instance-sidebar-back').should('be.visible').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');
  });

  it('should create a new mailjet integration', () => {
    interceptIntegrationRequests();

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();
    cy.getByTestId('create-provider-instance-sidebar-create').should('be.disabled');

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.location('pathname').should('contain', '/integrations/');

    checkTableRow(
      {
        name: 'Mailjet Integration',
        provider: 'Mailjet',
        channel: 'Email',
        environment: 'Development',
        status: 'Disabled',
      },
      6
    );
  });

  it('should create a new mailjet integration with conditions', () => {
    interceptIntegrationRequests();

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('add-conditions-btn').click();
    cy.getByTestId('conditions-form-title').contains('Conditions for Mailjet Integration provider instance');
    cy.getByTestId('add-new-condition').click();
    cy.getByTestId('conditions-form-on').should('have.value', 'Tenant');
    cy.getByTestId('conditions-form-key').type('identifier');
    cy.getByTestId('conditions-form-operator').should('have.value', 'Equal');
    cy.getByTestId('conditions-form-value').type('tenant123');
    cy.getByTestId('apply-conditions-btn').click();
    cy.getByTestId('add-conditions-btn').contains('Edit conditions');

    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();
    cy.getByTestId('create-provider-instance-sidebar-create').should('be.disabled');

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('header-add-conditions-btn').contains('1').click();
    cy.getByTestId('add-new-condition').click();
    cy.getByTestId('conditions-form-key').last().type('identifier');
    cy.getByTestId('conditions-form-value').last().type('tenant456');
    cy.getByTestId('apply-conditions-btn').click();
    cy.getByTestId('header-add-conditions-btn').contains('2');
    cy.location('pathname').should('contain', '/integrations/');

    checkTableRow(
      {
        name: 'Mailjet Integration',
        provider: 'Mailjet',
        channel: 'Email',
        environment: 'Development',
        status: 'Disabled',
        conditions: 1,
      },
      6
    );
  });

  it('should remove as primary when adding conditions', () => {
    interceptIntegrationRequests();

    cy.getByTestId('integrations-list-table')
      .getByTestId('integration-name-cell')
      .contains('SendGrid')
      .getByTestId('integration-name-cell-primary')
      .should('be.visible');

    clickOnListRow('SendGrid');
    cy.getByTestId('header-add-conditions-btn').click();

    cy.getByTestId('remove-primary-flag-modal').should('be.visible');
    cy.getByTestId('remove-primary-flag-modal').contains('Primary flag will be removed');
    cy.getByTestId('remove-primary-flag-modal').contains(
      'Adding conditions to the primary provider instance removes its primary status when a user applies changes by'
    );
    cy.getByTestId('remove-primary-flag-modal').find('button').contains('Cancel').should('be.visible');
    cy.getByTestId('remove-primary-flag-modal').find('button').contains('Got it').should('be.visible').click();

    cy.getByTestId('conditions-form-title').contains('Conditions for SendGrid provider instance');
    cy.getByTestId('add-new-condition').click();
    cy.getByTestId('conditions-form-on').should('have.value', 'Tenant');
    cy.getByTestId('conditions-form-key').type('identifier');
    cy.getByTestId('conditions-form-operator').should('have.value', 'Equal');
    cy.getByTestId('conditions-form-value').type('tenant123');

    cy.getByTestId('apply-conditions-btn').click();
    cy.getByTestId('provider-instance-name').first().clear().type('SendGrid test');

    cy.getByTestId('from').type('info@novu.co');
    cy.getByTestId('senderName').type('Novu');

    cy.getByTestId('update-provider-sidebar-update').should('not.be.disabled').contains('Update').click();
    cy.get('.mantine-Modal-modal button').contains('Make primary');

    cy.get('.mantine-Modal-close').click();
  });

  it('should remove conditions when set to primary', () => {
    interceptIntegrationRequests();

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('add-conditions-btn').click();
    cy.getByTestId('conditions-form-title').contains('Conditions for Mailjet Integration provider instance');

    cy.getByTestId('add-new-condition').click();

    cy.getByTestId('conditions-form-key').type('identifier');
    cy.getByTestId('conditions-form-value').type('tenant123');

    cy.getByTestId('apply-conditions-btn').click();

    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('header-add-conditions-btn').contains('1');

    cy.getByTestId('header-make-primary-btn').click();

    cy.getByTestId('remove-conditions-modal').should('be.visible');
    cy.getByTestId('remove-conditions-modal').contains('Conditions will be removed');
    cy.getByTestId('remove-conditions-modal').contains('Marking this instance as primary will remove all conditions');
    cy.getByTestId('remove-conditions-modal').find('button').contains('Cancel').should('be.visible');
    cy.getByTestId('remove-conditions-modal').find('button').contains('Remove conditions').should('be.visible').click();

    cy.getByTestId('header-make-primary-btn').should('not.exist');

    cy.getByTestId('integrations-list-table')
      .getByTestId('integration-name-cell')
      .contains('Mailjet Integration')
      .getByTestId('integration-name-cell-primary')
      .should('be.visible');
  });

  it('should update the mailjet integration', () => {
    interceptIntegrationRequests();

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('provider-instance-channel').should('contain', 'Email');
    cy.getByTestId('provider-instance-environment').should('contain', 'Development');
    cy.getByTestId('update-provider-sidebar').contains('Set up credentials to start sending notifications.');
    cy.getByTestId('update-provider-sidebar').getByTestId('is_active_id').should('have.value', 'false');
    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-instance-name')
      .should('have.value', 'Mailjet Integration');
    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-instance-identifier')
      .should('contain.value', 'mailjet');

    cy.getByTestId('update-provider-sidebar-update').should('be.disabled');
    cy.location('pathname').should('contain', '/integrations/');
    cy.getByTestId('provider-instance-name').first().clear().type('Mailjet Integration Updated');
    cy.getByTestId('is_active_id').check({ force: true });
    cy.getByTestId('apiKey').type('fake-api-key');
    cy.getByTestId('secretKey').type('fake-secret-key');
    cy.getByTestId('from').type('info@novu.co');
    cy.getByTestId('senderName').type('Novu');
    cy.getByTestId('update-provider-sidebar-update').should('not.be.disabled').contains('Update').click();

    cy.get('.mantine-Modal-close').click();

    checkTableRow(
      {
        name: 'Mailjet Integration Updated',
        provider: 'Mailjet',
        channel: 'Email',
        environment: 'Development',
        status: 'Active',
      },
      6
    );
  });

  it('should update the mailjet integration from the list', () => {
    interceptIntegrationRequests();

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('sidebar-close').should('be.visible').click();
    cy.location('pathname').should('equal', '/integrations');

    cy.wait('@getIntegrations');

    clickOnListRow('Mailjet Integration');
    cy.location('pathname').should('contain', '/integrations/');

    cy.getByTestId('update-provider-sidebar').contains('Set up credentials to start sending notifications.');
    cy.getByTestId('update-provider-sidebar').getByTestId('is_active_id').should('have.value', 'false');
    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-instance-name')
      .should('have.value', 'Mailjet Integration');
    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-instance-identifier')
      .should('contain.value', 'mailjet');

    cy.getByTestId('update-provider-sidebar-update').should('be.disabled');
    cy.location('pathname').should('contain', '/integrations/');
    cy.getByTestId('provider-instance-name').first().clear().type('Mailjet Integration Updated');
    cy.getByTestId('is_active_id').check({ force: true });
    cy.getByTestId('apiKey').type('fake-api-key');
    cy.getByTestId('secretKey').type('fake-secret-key');
    cy.getByTestId('from').type('info@novu.co');
    cy.getByTestId('senderName').type('Novu');
    cy.getByTestId('update-provider-sidebar-update').should('not.be.disabled').click();

    cy.get('.mantine-Modal-close').click();

    checkTableRow(
      {
        name: 'Mailjet Integration Updated',
        provider: 'Mailjet',
        channel: 'Email',
        environment: 'Development',
        status: 'Active',
      },
      6
    );
  });

  it('should allow to delete the mailjet integration', () => {
    cy.intercept('GET', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('DELETE', '*/integrations/*', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('deleteIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.location('pathname').should('equal', '/integrations/create');
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Mailjet}`).contains('Mailjet').click();
    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();

    cy.location('pathname').should('equal', '/integrations/create/email/mailjet');
    cy.getByTestId('provider-instance-name').clear().type('Mailjet Integration');
    cy.getByTestId('create-provider-instance-sidebar-create').should('not.be.disabled').contains('Create').click();

    cy.wait('@createIntegration');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('sidebar-close').should('be.visible').click();
    cy.location('pathname').should('equal', '/integrations');

    cy.wait('@getIntegrations');

    clickOnListRow('Mailjet Integration');
    cy.location('pathname').should('contain', '/integrations/');

    cy.getByTestId('update-provider-sidebar').find('[aria-haspopup="menu"]').click();
    cy.getByTestId('update-provider-sidebar').find('button[data-menu-item="true"]').contains('Delete').click();

    cy.getByTestId('delete-provider-instance-modal').should('be.visible');
    cy.getByTestId('delete-provider-instance-modal').contains('Delete Mailjet Integration instance?');
    cy.getByTestId('delete-provider-instance-modal').contains(
      'Deleting a provider instance will fail workflows relying on its configuration, leading to undelivered notifications.'
    );
    cy.getByTestId('delete-provider-instance-modal').find('button').contains('Cancel').should('be.visible');
    cy.getByTestId('delete-provider-instance-modal')
      .find('button')
      .contains('Delete instance')
      .should('be.visible')
      .click();

    cy.wait('@deleteIntegration');

    cy.getByTestId('integrations-list-table')
      .getByTestId('integration-name-cell')
      .contains('Mailjet Integration')
      .should('not.exist');
  });

  it('should show the Novu in-app integration', () => {
    cy.intercept('GET', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('DELETE', '*/integrations/*', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('deleteIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    clickOnListRow('Novu In-App');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('sidebar-close').should('be.visible');
    cy.location('pathname').should('contain', '/integrations/');
    cy.getByTestId('provider-instance-channel').should('contain', 'In-App');
    cy.getByTestId('provider-instance-environment').should('contain', 'Development');
    cy.getByTestId('update-provider-sidebar').contains(
      'Select a framework to set up credentials to start sending notifications.'
    );
    cy.getByTestId('update-provider-sidebar')
      .find('a[href^="https://docs.novu.co/notification-center/introduction"]')
      .contains('Explore set-up guide');
    cy.getByTestId('is_active_id').should('have.value', 'true');
    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId(`selected-provider-image-${InAppProviderIdEnum.Novu}`).should(
          'have.attr',
          'src',
          `/static/images/providers/dark/square/${InAppProviderIdEnum.Novu}.svg`
        );
        return;
      }

      cy.getByTestId(`selected-provider-image-${InAppProviderIdEnum.Novu}`).should(
        'have.attr',
        'src',
        `/static/images/providers/light/square/${InAppProviderIdEnum.Novu}.svg`
      );
    });

    cy.getByTestId('provider-instance-name').should('be.visible').should('have.value', 'Novu In-App');
    cy.getByTestId('provider-instance-identifier').should('contain.value', 'novu-in-app');
    cy.getByTestId('hmac').should('not.be.checked');
    cy.getByTestId('novu-in-app-frameworks').contains('Integrate In-App using a framework below');
    cy.getByTestId('novu-in-app-frameworks').contains('React');
    cy.getByTestId('novu-in-app-frameworks').contains('Angular');
    cy.getByTestId('novu-in-app-frameworks').contains('Web Component');
    cy.getByTestId('novu-in-app-frameworks').contains('Headless');
    cy.getByTestId('novu-in-app-frameworks').contains('Vue');
    cy.getByTestId('novu-in-app-frameworks').contains('iFrame');
    cy.getByTestId('update-provider-sidebar-update').should('be.disabled').contains('Update');
  });

  it('should show the Novu in-app integration - React guide', () => {
    cy.intercept('GET', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('DELETE', '*/integrations/*', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('deleteIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    clickOnListRow('Novu In-App');

    cy.getByTestId('update-provider-sidebar').should('be.visible');
    cy.getByTestId('novu-in-app-frameworks').contains('React').click();

    cy.getByTestId('update-provider-sidebar').contains('React integration guide');
    cy.getByTestId('sidebar-back').should('be.visible');
    cy.getByTestId('setup-timeline').should('be.visible');
    cy.getByTestId('update-provider-sidebar-update').should('be.disabled').contains('Update');
  });

  it('should show the Novu Email integration sidebar', () => {
    cy.intercept('GET', '*/integrations', async (req) => {
      req.continue((res) => {
        const {
          body: { data },
        } = res;
        const [firstIntegration] = data;

        res.body.data = [
          ...data,
          {
            _id: EmailProviderIdEnum.Novu,
            _environmentId: firstIntegration._environmentId,
            providerId: EmailProviderIdEnum.Novu,
            active: true,
            channel: ChannelTypeEnum.EMAIL,
            name: 'Novu Email',
            identifier: EmailProviderIdEnum.Novu,
          },
        ];
      });
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('GET', '*/integrations/email/limit', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getNovuEmailLimit');
    cy.intercept('DELETE', '*/integrations/*', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('deleteIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    clickOnListRow('Novu Email');

    cy.wait('@getNovuEmailLimit');
    cy.getByTestId('update-provider-sidebar-novu').should('be.visible');
    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId('update-provider-sidebar-novu').find(
          'img[src="/static/images/providers/dark/square/novu-email.svg"]'
        );
        return;
      }

      cy.getByTestId('update-provider-sidebar-novu').find(
        'img[src="/static/images/providers/light/square/novu-email.svg"]'
      );
    });

    cy.getByTestId('provider-instance-channel').should('contain', 'Email');
    cy.getByTestId('provider-instance-environment').should('contain', 'Development');
    cy.getByTestId('update-provider-sidebar-novu')
      .getByTestId('provider-instance-name')
      .should('have.value', 'Novu Email');
    cy.getByTestId('update-provider-sidebar-novu').contains('Test Provider');
    cy.getByTestId('novu-provider-limits').then((el) => {
      expect(el.get(0).innerText).to.eq(
        'Novu provider allows sending max 300 emails per month,\nto send more messages, configure a different provider'
      );
    });
    cy.getByTestId('limitbar-limit').then((el) => {
      expect(el.get(0).innerText).to.eq('300 emails per month');
    });
  });

  it('should show the Novu SMS integration sidebar', () => {
    cy.intercept('GET', '*/integrations', async (req) => {
      req.continue((res) => {
        const {
          body: { data },
        } = res;
        const [firstIntegration] = data;

        res.body.data = [
          ...data,
          {
            _id: SmsProviderIdEnum.Novu,
            _environmentId: firstIntegration._environmentId,
            providerId: SmsProviderIdEnum.Novu,
            active: true,
            channel: ChannelTypeEnum.SMS,
            name: 'Novu SMS',
            identifier: SmsProviderIdEnum.Novu,
          },
        ];
      });
    }).as('getIntegrations');
    cy.intercept('POST', '*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('createIntegration');
    cy.intercept('GET', '*/integrations/sms/limit', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getNovuSmsLimit');
    cy.intercept('DELETE', '*/integrations/*', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('deleteIntegration');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    clickOnListRow('Novu SMS');

    cy.wait('@getNovuSmsLimit');
    cy.getByTestId('update-provider-sidebar-novu').should('be.visible');
    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId('update-provider-sidebar-novu').find(
          'img[src="/static/images/providers/dark/square/novu-sms.svg"]'
        );
        return;
      }

      cy.getByTestId('update-provider-sidebar-novu').find(
        'img[src="/static/images/providers/light/square/novu-sms.svg"]'
      );
    });
    cy.getByTestId('provider-instance-channel').should('contain', 'SMS');
    cy.getByTestId('provider-instance-environment').should('contain', 'Development');
    cy.getByTestId('update-provider-sidebar-novu')
      .getByTestId('provider-instance-name')
      .should('have.value', 'Novu SMS');
    cy.getByTestId('update-provider-sidebar-novu').contains('Test Provider');
    cy.getByTestId('novu-provider-limits').then((el) => {
      expect(el.get(0).innerText).to.eq(
        'Novu provider allows sending max 20 messages per month,\nto send more messages, configure a different provider'
      );
    });
    cy.getByTestId('limitbar-limit').then((el) => {
      expect(el.get(0).innerText).to.eq('20 messages per month');
    });
  });

  it('should not allow creating a novu provider for the same environment if it already exists', () => {
    cy.intercept('*/integrations', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }).as('getIntegrations');
    cy.intercept('*/environments').as('getEnvironments');

    cy.visit('/integrations');

    cy.wait('@getIntegrations');
    cy.wait('@getEnvironments');

    cy.getByTestId('add-provider').should('be.enabled').click();
    cy.getByTestId('select-provider-sidebar').should('be.visible');

    cy.getByTestId(`provider-${EmailProviderIdEnum.Novu}`).contains('Novu').click();

    cy.window().then((win) => {
      if (win.isDarkTheme) {
        cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Novu}`).should(
          'have.attr',
          'src',
          `/static/images/providers/dark/square/${EmailProviderIdEnum.Novu}.svg`
        );
        return;
      }

      cy.getByTestId(`selected-provider-image-${EmailProviderIdEnum.Novu}`).should(
        'have.attr',
        'src',
        `/static/images/providers/light/square/${EmailProviderIdEnum.Novu}.svg`
      );
    });
    cy.getByTestId('selected-provider-name').should('be.visible').contains('Novu');

    cy.getByTestId('select-provider-sidebar-next').should('not.be.disabled').contains('Next').click();
    cy.getByTestId('novu-provider-error').contains('You can only create one Novu Email per environment.');
    cy.getByTestId('create-provider-instance-sidebar-create').should('be.disabled');
  });

  it('should show the Webhook URL for the Email integration', () => {
    interceptIntegrationRequests();
    cy.intercept(
      {
        method: 'GET',
        url: '*/integrations/webhook/provider/*/status',
      },
      { data: true }
    ).as('getWebhookStatus');

    cy.getByTestId('integrations-list-table')
      .getByTestId('integration-name-cell')
      .contains('SendGrid')
      .getByTestId('integration-name-cell-primary')
      .should('be.visible');

    clickOnListRow('SendGrid');

    cy.wait('@getWebhookStatus');

    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-webhook-url')
      .invoke('val')
      .then((val) => {
        expect(val).match(
          /^http:\/\/(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):\d{4}\/webhooks\/organizations\/\w{1,}\/environments\/\w{1,}\/email\/\w{1,}/
        );
      });
  });

  it('should show the Webhook URL for the SMS integration', () => {
    interceptIntegrationRequests();
    cy.intercept(
      {
        method: 'GET',
        url: '*/integrations/webhook/provider/*/status',
      },
      { data: true }
    ).as('getWebhookStatus');

    cy.getByTestId('integrations-list-table')
      .getByTestId('integration-name-cell')
      .contains('SendGrid')
      .getByTestId('integration-name-cell-primary')
      .should('be.visible');

    clickOnListRow('Twilio');

    cy.wait('@getWebhookStatus');

    cy.getByTestId('update-provider-sidebar')
      .getByTestId('provider-webhook-url')
      .invoke('val')
      .then((val) => {
        expect(val).match(
          /^http:\/\/(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):\d{4}\/webhooks\/organizations\/\w{1,}\/environments\/\w{1,}\/sms\/\w{1,}/
        );
      });
  });
});
