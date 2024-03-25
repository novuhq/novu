import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';

describe('Billing', function () {
  beforeEach(function () {
    cy.initializeSession().as('session');
  });

  it('should display billing page', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: null,
        trialEnd: null,
        hasPaymentMethod: false,
        status: 'active',
      },
    }).as('getSubscription');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);

    cy.getByTestId('plan-title').should('have.text', 'Plans');
  });

  it('should display free trial widget', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: startOfDay(new Date()),
        trialEnd: addDays(endOfDay(new Date()), 30),
        hasPaymentMethod: false,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.visit('/workflows');

    cy.wait(['@getSubscription']);
    cy.getByTestId('free-trial-widget-text').should('have.text', '30 days left on your Business trial');
    cy.getByTestId('free-trial-widget-button').should('have.text', 'Upgrade to Business');
    cy.getByTestId('free-trial-widget-progress').find('.mantine-Progress-bar').should('have.css', 'width', '0px');
  });

  it('should display free trial widget after 10 days', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: subDays(startOfDay(new Date()), 10),
        trialEnd: addDays(endOfDay(new Date()), 20),
        hasPaymentMethod: false,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.visit('/workflows');

    cy.wait(['@getSubscription']);
    cy.getByTestId('free-trial-widget-text').should('have.text', '20 days left on your Business trial');
    cy.getByTestId('free-trial-widget-button').should('have.text', 'Upgrade to Business');
    cy.getByTestId('free-trial-widget-progress')
      .find('.mantine-Progress-bar')
      .should('have.css', 'background-color', 'rgb(77, 153, 128)');
  });

  it('should display free trial widget after 20 days', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: subDays(startOfDay(new Date()), 20),
        trialEnd: addDays(endOfDay(new Date()), 10),
        hasPaymentMethod: false,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.visit('/workflows');

    cy.wait(['@getSubscription']);
    cy.getByTestId('free-trial-widget-text').should('have.text', '10 days left on your Business trial');
    cy.getByTestId('free-trial-widget-button').should('have.text', 'Upgrade to Business');
    cy.getByTestId('free-trial-widget-progress')
      .find('.mantine-Progress-bar')
      .should('have.css', 'background-color', 'rgb(253, 224, 68)');
    cy.getByTestId('free-trial-banner').should('exist');
    cy.getByTestId('free-trial-banner-upgrade').should('have.text', 'Upgrade');
    cy.getByTestId('free-trial-banner-contact-sales').should('have.text', 'Contact sales');
  });

  it('should not display free trial widget after 30 days', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: null,
        trialEnd: null,
        hasPaymentMethod: false,
        status: 'active',
      },
    }).as('getSubscription');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);
    cy.getByTestId('free-trial-widget-text').should('not.exist');
    cy.getByTestId('free-trial-plan-widget').should('not.exist');
  });

  it('should display free trail info on billing page', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: startOfDay(new Date()),
        trialEnd: addDays(endOfDay(new Date()), 30),
        hasPaymentMethod: false,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.intercept('GET', '**/v1/organizations', (request) => {
      request.reply((response) => {
        if (!response.body.data) {
          return response;
        }

        response.body['data'] = [
          {
            ...response.body.data[0],
            apiServiceLevel: 'business',
          },
        ];
        return response;
      });
    }).as('organizations');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);

    cy.getByTestId('plan-title').should('have.text', 'Plans');
    cy.getByTestId('free-trial-plan-widget').should('have.text', '30 days left on your trial');
    cy.getByTestId('plan-business-current').should('exist');
    cy.getByTestId('plan-business-add-payment').should('exist');
  });

  it('should be able to manage subscription', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: null,
        trialEnd: null,
        hasPaymentMethod: true,
        status: 'active',
      },
    }).as('getSubscription');

    cy.intercept('GET', '**/v1/organizations', (request) => {
      request.reply((response) => {
        if (!response.body.data) {
          return response;
        }

        response.body['data'] = [
          {
            ...response.body.data[0],
            apiServiceLevel: 'business',
          },
        ];
        return response;
      });
    }).as('organizations');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);

    cy.getByTestId('plan-title').should('have.text', 'Plans');
    cy.getByTestId('plan-business-current').should('exist');
    cy.getByTestId('plan-business-manage').should('exist');
  });

  it('should be able to upgrade from free', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: null,
        trialEnd: null,
        hasPaymentMethod: null,
        status: 'active',
      },
    }).as('getSubscription');

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

    cy.wait(['@getSubscription']);

    cy.getByTestId('plan-title').should('have.text', 'Plans');
    cy.getByTestId('plan-free-current').should('exist');
    cy.getByTestId('plan-business-upgrade').should('exist');
  });

  it('should display billing page', function () {
    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: subDays(startOfDay(new Date()), 20),
        trialEnd: addDays(endOfDay(new Date()), 10),
        hasPaymentMethod: false,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.intercept('GET', '**/v1/organizations', (request) => {
      request.reply((response) => {
        if (!response.body.data) {
          return response;
        }

        response.body['data'] = [
          {
            ...response.body.data[0],
            apiServiceLevel: 'business',
          },
        ];
        return response;
      });
    }).as('organizations');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);

    cy.getByTestId('plan-title').should('have.text', 'Plans');
    cy.getByTestId('plan-business-current').should('exist');
    cy.getByTestId('plan-business-add-payment').should('exist');
    cy.getByTestId('free-trial-plan-widget').should('have.text', '10 days left on your trial');
    cy.getByTestId('free-trial-widget-text').should('have.text', '10 days left on your Business trial');
    cy.getByTestId('free-trial-banner').should('exist');

    cy.intercept('GET', '**/v1/billing/subscription', {
      data: {
        trialStart: startOfDay(new Date()),
        trialEnd: addDays(endOfDay(new Date()), 30),
        hasPaymentMethod: true,
        status: 'trialing',
      },
    }).as('getSubscription');

    cy.visit('/settings/billing');

    cy.wait(['@getSubscription']);
    cy.getByTestId('free-trial-plan-widget').should('not.exist');
    cy.getByTestId('free-trial-widget-text').should('not.exist');
    cy.getByTestId('free-trial-banner').should('not.exist');
  });
});
