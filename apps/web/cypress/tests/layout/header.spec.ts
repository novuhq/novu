describe('App Header', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
    cy.visit('/');
  });

  it('should switch to dark mode', function () {});

  it('should display correct user photo', function () {
    cy.getByTestId('header-profile-avatar')
      .find('img')
      .should('have.attr', 'src')
      .should('include', this.session.user.profilePicture);
  });

  it('should display user name in dropdown', function () {
    cy.getByTestId('header-profile-avatar').click();
    cy.getByTestId('header-dropdown-username').should('contain', this.session.user.firstName);
    cy.getByTestId('header-dropdown-username').should('contain', this.session.user.lastName);
  });

  it('should display organization name in dropdown', function () {
    cy.getByTestId('header-profile-avatar').click();
    cy.getByTestId('header-dropdown-organization-name').contains(this.session.organization.name, {
      matchCase: false,
    });
  });

  it('logout user successfully', function () {
    cy.getByTestId('header-profile-avatar').click();
    cy.getByTestId('logout-button').click();
    cy.location('pathname').should('equal', '/auth/login');

    cy.window()
      .then((win) => {
        return win.localStorage.getItem('auth_token');
      })
      .should('not.be.ok');

    cy.visit('/');
    cy.location('pathname').should('equal', '/auth/login');
  });
});
