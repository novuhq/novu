import { mount } from 'cypress/react';
import { TestWrapper } from '../../../testing';
import { TriggerSnippetTabs } from './TriggerSnippetTabs';
import { TriggerTypeEnum } from '@novu/shared';

it('should not display comma when no variables present', function () {
  mount(
    <TestWrapper>
      <TriggerSnippetTabs
        trigger={{ variables: [], type: TriggerTypeEnum.EVENT, identifier: '1234', subscriberVariables: [] }}
      ></TriggerSnippetTabs>
    </TestWrapper>
  );

  cy.getByTestId('trigger-code-snippet').contains(`subscriberId: '<REPLACE_WITH_DATA>'`);
  cy.getByTestId('trigger-code-snippet').should('not.contain', `subscriberId: '<REPLACE_WITH_DATA>',`);

  cy.get('button').contains('Curl').click();

  cy.getByTestId('trigger-curl-snippet').contains(`"subscriberId": "<REPLACE_WITH_DATA>"`);
  cy.getByTestId('trigger-curl-snippet').should('not.contain', `"subscriberId": "<REPLACE_WITH_DATA>",`);
});

it('should  display comma when variables present', function () {
  mount(
    <TestWrapper>
      <TriggerSnippetTabs
        trigger={{
          variables: [{ name: 'firstVariable' }, { name: 'secondVariable' }],
          type: TriggerTypeEnum.EVENT,
          identifier: '1234',
          subscriberVariables: [{ name: 'firstSubscriberVariable' }, { name: 'secondSubscriberVariable' }],
        }}
      ></TriggerSnippetTabs>
    </TestWrapper>
  );

  cy.getByTestId('trigger-code-snippet').contains(`subscriberId: '<REPLACE_WITH_DATA>',`);
  cy.getByTestId('trigger-code-snippet').contains(`firstSubscriberVariable: '<REPLACE_WITH_DATA>',`);
  cy.getByTestId('trigger-code-snippet').contains(`secondSubscriberVariable: '<REPLACE_WITH_DATA>'`);
  cy.getByTestId('trigger-code-snippet').should('not.contain', `secondSubscriberVariable: '<REPLACE_WITH_DATA>',`);

  cy.get('button').contains('Curl').click();
  cy.getByTestId('trigger-curl-snippet').contains(`"subscriberId": "<REPLACE_WITH_DATA>",`);
  cy.getByTestId('trigger-curl-snippet').contains(`"firstSubscriberVariable": "<REPLACE_WITH_DATA>",`);
  cy.getByTestId('trigger-curl-snippet').contains(`"secondSubscriberVariable": "<REPLACE_WITH_DATA>"`);
});
