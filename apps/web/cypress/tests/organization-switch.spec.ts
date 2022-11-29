import * as capitalize from 'lodash.capitalize';

describe('Organization Switch', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display switch when page is loaded', function () {
    cy.visit('/templates');

    cy.getByTestId('organization-switch')
      .should('be.visible')
      .should('have.value', capitalize(this.session.organization.name));
  });

  it('should use different jwt token after switches', function () {
    const originToken = this.session.token;
    cy.task('addOrganization', this.session.user.id).then((newOrg: any) => {
      cy.visit('/templates');

      cy.getByTestId('organization-switch').focus();

      cy.get('.mantine-Select-item').contains(capitalize(newOrg.name)).click();

      cy.wait(1000);

      cy.task('getSession', {}).then((response: any) => {
        expect(response.token).not.to.equal(originToken);
      });
    });
  });
});
