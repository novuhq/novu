/** cspell:disable */
describe('Billing - Annual subscription', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');

    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: null,
        trialEnd: null,
        hasPaymentMethod: false,
        status: 'active',
      },
    }).as('getSubscription');
  });

  it('should display monthly in modal as default', function () {
    cy.intercept('POST', '**/billing/checkout', {
      data: {
        clientSecret: 'seti_1Mm8s8LkdIwHu7ix0OXBfTRG_secret_NXDICkPqPeiBTAFqWmkbff09lRmSVXe',
      },
    }).as('checkout');

    cy.visit('/settings/billing');

    cy.getByTestId('plan-business-upgrade').click();
    cy.wait(['@checkout']);

    cy.getByTestId('billing-interval-control-monthly')
      .last()
      .parent()
      .should('have.class', 'mantine-SegmentedControl-labelActive');

    cy.getByTestId('modal-monthly-pricing').should('exist');
  });

  it('should display annually if it is selected before open modal', function () {
    cy.intercept('POST', '**/billing/checkout', {
      data: {
        clientSecret: 'seti_1Mm8s8LkdIwHu7ix0OXBfTRG_secret_NXDICkPqPeiBTAFqWmkbff09lRmSVXe',
      },
    }).as('checkout');

    cy.visit('/settings/billing');

    cy.getByTestId('billing-interval-control-annually').click();

    cy.getByTestId('plan-business-upgrade').click();
    cy.wait(['@checkout']);

    cy.getByTestId('billing-interval-control-annually')
      .last()
      .parent()
      .should('have.class', 'mantine-SegmentedControl-labelActive');

    cy.getByTestId('modal-anually-pricing').should('exist');
  });

  it('should display billing page with billing interval control', function () {
    cy.intercept('GET', '**/v1/organizations', (request) => {
      request.reply((response) => {
        if (!response.body.data) {
          return response;
        }

        response.body['data'] = [
          {
            ...response.body.data[0],
            apiServiceLevel: 'free',
          },
        ];
        return response;
      });
    }).as('organizations');

    cy.visit('/settings/billing');

    cy.getByTestId('billing-interval-control').should('exist');
    cy.getByTestId('billing-interval-price').should('have.text', '$250 month package / billed monthly');
    cy.getByTestId('billing-interval-control-annually').click();
    cy.getByTestId('billing-interval-control-annually')
      .parent()
      .should('have.class', 'mantine-SegmentedControl-labelActive');
    cy.getByTestId('billing-interval-price').should(
      'have.text',
      `$${(2700).toLocaleString()} year package / billed annually`
    );
  });
});
