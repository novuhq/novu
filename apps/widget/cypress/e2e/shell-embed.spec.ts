import { ChannelCTATypeEnum, ChannelTypeEnum } from '@novu/shared/src';
import { IInitializeSessionSettings } from '../global';

describe('Shell Embed', function () {
  beforeEach(function () {
    cy.initializeSession({ shell: true }).as('session');
    cy.wait(1000);
  });

  it('should navigate to page on notification click', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
    });

    cy.get('#notification-bell').click();

    const handlerObject = {
      handler: () => {},
    };
    cy.spy(handlerObject, 'handler').as('spy');

    cy.window().then((w) => {
      w.novu.on('notification_click', handlerObject.handler);
    });

    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .should('not.be.empty')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="notification-list-item"]').first().click();
      });
    cy.get('@spy').should('be.called');

    cy.url().should('include', '/cypress/test-shell/example/test?test-param=true');
  });

  it('should open and close widget on body click', function () {
    cy.get('#notification-bell').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="main-wrapper"]').should('be.visible');
      });
    cy.get('body').click();
    cy.get('#novu-iframe-element')
      .its('0.contentDocument.body')
      .then((body) => {
        cy.wrap(body).find('[data-test-id="main-wrapper"]').should('not.be.visible');
      });
  });

  it('should display unseen count outside', function () {
    cy.task('createNotifications', {
      identifier: this.session.templates[0].triggers[0].identifier,
      token: this.session.token,
      subscriberId: this.session.subscriber.subscriberId,
      count: 5,
    });
    cy.get('#notification-bell .ntf-counter').should('be.visible');
  });
});

describe('Shell Embed - Seen Read', function () {
  beforeEach(function () {
    cy.initializeSession(initializeSessionSettings, templateOverride).as('session');
    cy.wait(1000);
    cy.viewport(1280, 800);
  });
});

const initializeSessionSettings = {
  shell: true,
  tabs: [
    { name: 'Seen', storeId: 'seen' },
    { name: 'Unseen', storeId: 'unseen' },
    { name: 'Read', storeId: 'read' },
    { name: 'Unread', storeId: 'unread' },
  ],
  stores: [
    { storeId: 'seen', query: { seen: true } },
    { storeId: 'unseen', query: { seen: false } },
    { storeId: 'read', query: { read: true } },
    { storeId: 'unread', query: { read: false } },
  ],
} as IInitializeSessionSettings;

const templateOverride = {
  steps: [
    {
      type: ChannelTypeEnum.IN_APP,
      content: 'Test content for <b>{{firstName}}</b>',
      cta: {
        type: ChannelCTATypeEnum.REDIRECT,
        data: {},
      },
    },
  ],
};
