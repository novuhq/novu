describe('Tenants Page', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display empty tenants state', function () {
    cy.visit('/tenants');

    cy.getByTestId('no-tenant-placeholder').contains('Add the first tenant for the');
  });

  it('should add new tenant', function () {
    createTenant();

    cy.visit('/tenants');

    cy.getByTestId('tenants-list-table').find('td:nth-child(1)').contains('Test Tenant');
    cy.getByTestId('tenants-list-table').find('td:nth-child(2)').contains('test-tenant');
  });

  it('should update tenant', function () {
    createTenant();

    //update tenant name
    cy.getByTestId('tenants-list-table')
      .find('tr')
      .eq(1)
      .click({ force: true })
      .then(() => {
        cy.getByTestId('tenant-name').clear().type('New Name');
        cy.getByTestId('update-tenant-sidebar-submit').click();
      });

    cy.waitForNetworkIdle(500);

    cy.getByTestId('tenants-list-table').find('td:nth-child(1)').contains('New Name');
    cy.getByTestId('tenants-list-table').find('td:nth-child(2)').contains('test-tenant');

    //update tenant identifier
    cy.getByTestId('tenants-list-table')
      .find('tr')
      .eq(1)
      .click({ force: true })
      .then(() => {
        cy.getByTestId('tenant-identifier').clear().type('new-identifier');
        cy.getByTestId('update-tenant-sidebar-submit').click();
      });

    cy.getByTestId('tenants-list-table').find('td:nth-child(1)').contains('New Name');
    cy.getByTestId('tenants-list-table').find('td:nth-child(2)').contains('new-identifier');
  });

  function createTenant() {
    cy.visit('/tenants');

    cy.getByTestId('add-tenant').click();
    cy.getByTestId('tenant-name').type('Test Tenant');
    cy.getByTestId('tenant-custom-properties').type('{"Org Name" : "Nike"}', { parseSpecialCharSequences: false });
    cy.getByTestId('create-tenant-sidebar-submit').click();
  }
});
