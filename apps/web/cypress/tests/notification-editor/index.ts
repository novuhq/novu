export type Channel = 'inApp' | 'email' | 'sms' | 'chat' | 'push' | 'digest' | 'delay';

export function addAndEditChannel(channel: Channel) {
  cy.waitForNetworkIdle(500);

  goBack();
  dragAndDrop(channel);
  cy.waitForNetworkIdle(500);
  editChannel(channel, true);
}

export function dragAndDrop(channel: Channel, dropTestId = 'addNodeButton') {
  const dataTransfer = new DataTransfer();

  cy.getByTestId(`dnd-${channel}Selector`).trigger('dragstart', { dataTransfer });
  cy.getByTestId(dropTestId).parent().trigger('drop', { dataTransfer });
}

export function editChannel(channel: Channel, last = false) {
  cy.clickWorkflowNode(`node-${channel}Selector`, last);
  if (['inApp', 'email', 'sms', 'chat', 'push'].includes(channel)) {
    cy.getByTestId('edit-action').click();
  }
}

export function goBack() {
  cy.getByTestId('sidebar-close').click();
  cy.waitForNetworkIdle(500);
}

export function fillBasicNotificationDetails(title?: string) {
  cy.waitForNetworkIdle(500);
  cy.getByTestId('settings-page').click();
  cy.getByTestId('title')
    .first()
    .clear()
    .type(title || 'Test Notification Title')
    .blur();
  cy.getByTestId('description').type('This is a test description for a test title').blur();
}

export function clickWorkflow() {
  cy.getByTestId('workflowButton').click();
}

export function awaitGetContains(getSelector: string, contains: string) {
  return cy
    .waitUntil(
      () =>
        cy
          .get(getSelector)
          .contains(contains)
          .as('awaitedElement')
          .wait(1) // for some reason this is needed, otherwise next line returns `true` even if click() fails due to detached element in the next step
          .then(($el) => {
            return Cypress.dom.isAttached($el);
          }),
      { timeout: 5000, interval: 500 }
    )
    .get('@awaitedElement');
}
