describe('Settings Screen', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/settings/widget');
    cy.intercept('*/channels/email/settings').as('updateEmailSettings');
    cy.intercept('*/channels/sms/settings').as('updateSmsSettings');
    cy.intercept('*/applications/branding').as('updateBrandingSettings');
  });

  it('should update the twilio credentials', function () {
    cy.get('.mantine-Tabs-tabsList').contains('SMS').click();
    cy.getByTestId('account-sid').clear().type('12345');
    cy.getByTestId('auth-token').clear().type('56789');
    cy.getByTestId('phone-number').clear().type('+1111111');
    cy.getByTestId('submit-update-settings').click();
    cy.wait('@updateSmsSettings');
    cy.reload();
    cy.get('.mantine-Tabs-tabsList').contains('SMS').click();
    cy.getByTestId('auth-token').should('have.value', '56789');
    cy.getByTestId('account-sid').should('have.value', '12345');
  });

  it('should display the embed code successfully', function () {
    cy.get('.mantine-Tabs-tabsList').contains('In App Center').click();

    cy.getByTestId('embed-code-snippet').then(function (a) {
      expect(a).to.contain(this.session.application.identifier);
      expect(a).to.contain('notifire.init');
    });
  });

  it('should display the api key of the app', function () {
    cy.get('.mantine-Tabs-tabsList').contains('Api Keys').click();
    cy.getByTestId('api-key-container').should('have.value', this.session.application.apiKeys[0].key);
  });

  it('should update the email channel senderEmail', function () {
    cy.get('.mantine-Tabs-tabsList').contains('Email Settings').click();
    cy.getByTestId('sender-email').type('new-testing@email.com');
    cy.getByTestId('sender-name').type('Test Sender Name');
    cy.getByTestId('submit-update-settings').click();
    cy.wait('@updateEmailSettings');
    cy.reload();

    cy.get('.mantine-Tabs-tabsList').contains('Email Settings').click();
    cy.getByTestId('sender-email').should('have.value', 'new-testing@email.com');
    cy.getByTestId('sender-name').should('have.value', 'Test Sender Name');
  });

  it.skip('should update logo', function () {
    cy.fixture('test-logo.png').then((fileContent) => {
      cy.getByTestId('upload-image-button').attachFile({
        fileContent: b64toBlob(fileContent),
        fileName: 'test-logo.png',
        mimeType: 'image/png',
      });
    });

    cy.get('.ant-upload-picture-card-wrapper img').should('have.attr', 'src').should('include', '.png');
    cy.get('.ant-upload-picture-card-wrapper img')
      .should('have.attr', 'src')
      .should('include', this.session.organization._id);
    cy.getByTestId('submit-branding-settings').click();

    cy.get('.ant-upload-picture-card-wrapper img').should('have.attr', 'src').should('include', '.png');
    cy.get('.ant-upload-picture-card-wrapper img')
      .should('have.attr', 'src')
      .should('include', this.session.organization._id);
  });

  /**
   * TODO: Fix the test for content-background-color assertion
   */
  it.skip('should change look and feel settings', function () {
    cy.getByTestId('color-picker').click({ force: true });
    cy.get('.block-picker:visible  div[title="#ba68c8"]').click({ force: true });
    cy.getByTestId('color-picker').click({ force: true });
    cy.getByTestId('color-picker-value').should('have.value', '#ba68c8');

    cy.getByTestId('font-color-picker').click({ force: true });
    cy.get('body').click();
    cy.get('.block-picker:visible div[title="#37D67A"]').click({ force: true });
    cy.getByTestId('font-color-picker').click({ force: true });
    cy.getByTestId('font-color-picker-value').should('have.value', '#37d67a');

    cy.getByTestId('content-background-picker').click({ force: true });
    cy.get('.block-picker:visible  div[title="#2CCCE4"]').click({ force: true });
    cy.getByTestId('content-background-picker').click({ force: true });
    cy.getByTestId('content-background-picker-value').should('have.value', '#2ccce4');

    cy.getByTestId('font-family-selector').type('Nunito{enter}');

    cy.getByTestId('submit-branding-settings').click({ force: true });
    cy.wait('@updateBrandingSettings');

    cy.reload();
    cy.getByTestId('color-picker-value').should('have.value', '#ba68c8');
    cy.getByTestId('font-color-picker-value').should('have.value', '#37d67a');
    cy.getByTestId('content-background-picker-value').should('have.value', '#2ccce4');
    cy.getByTestId('font-family-selector').contains('Nunito');
  });
});

function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays: any[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}
