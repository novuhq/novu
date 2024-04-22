import * as capitalize from 'lodash.capitalize';

describe('Organization Switch', function () {
  beforeEach(function () {
    cy.mockFeatureFlags({ IS_INFORMATION_ARCHITECTURE_ENABLED: false });
    cy.initializeSession().as('session');
  });

  it('should display switch when page is loaded', function () {
    cy.visit('/workflows');

    cy.getByTestId('organization-switch')
      .scrollIntoView()
      .should('be.visible')
      .should('have.value', capitalize(this.session.organization.name));
  });

  it('should use different jwt token after switches', function () {
    const originToken = this.session.token;
    cy.task('addOrganization', this.session.user.id).then((newOrg: any) => {
      cy.visit('/workflows');

      cy.getByTestId('organization-switch').scrollIntoView().focus();

      cy.get('.mantine-Select-item').contains(capitalize(newOrg.name)).click({ force: true });

      cy.wait(1000);

      cy.task('getSession', {}).then((response: any) => {
        expect(response.token).not.to.equal(originToken);
      });
    });
  });
});
