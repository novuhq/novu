import { mount } from 'cypress/react';
import { TestWrapper } from '../../testing';
import { TriggerSnippetTabs } from './TriggerSnippetTabs';
import { TriggerTypeEnum } from '@novu/shared';

it('should not display comma when no variables present', function () {
  const trigger = { variables: [], type: TriggerTypeEnum.EVENT, identifier: '1234', subscriberVariables: [] };

  mount(
    <TestWrapper>
      <TriggerSnippetTabs
        trigger={trigger}
        template={{
          name: '1234',
          _notificationGroupId: '',
          _environmentId: '',
          tags: [],
          draft: false,
          active: true,
          critical: false,
          preferenceSettings: {},
          steps: [],
          triggers: [trigger],
        }}
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
  const trigger = {
    variables: [{ name: 'firstVariable' }, { name: 'secondVariable' }],
    type: TriggerTypeEnum.EVENT,
    identifier: '1234',
    subscriberVariables: [{ name: 'firstSubscriberVariable' }, { name: 'secondSubscriberVariable' }],
  };

  mount(
    <TestWrapper>
      <TriggerSnippetTabs
        trigger={trigger}
        template={{
          name: '1234',
          _notificationGroupId: '',
          _environmentId: '',
          tags: [],
          draft: false,
          active: true,
          critical: false,
          preferenceSettings: {},
          steps: [],
          triggers: [trigger],
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

it('should  display delay path when delay step with schedule path is present', function () {
  mount(
    <TestWrapper>
      <TriggerSnippetTabs
        trigger={{
          variables: [],
          type: TriggerTypeEnum.EVENT,
          identifier: '1234',
          subscriberVariables: [],
        }}
        template={{
          name: '1234',
          _notificationGroupId: '',
          _environmentId: '',
          tags: [],
          draft: false,
          active: true,
          critical: false,
          preferenceSettings: {},
          steps: [
            {
              metadata: {
                delayPath: 'sendAt',
              },
            },
          ],
          triggers: [
            {
              variables: [],
              type: TriggerTypeEnum.EVENT,
              identifier: '1234',
              subscriberVariables: [],
            },
          ],
        }}
      ></TriggerSnippetTabs>
    </TestWrapper>
  );

  cy.getByTestId('trigger-code-snippet').contains(`sendAt: '<REPLACE_WITH_DATA>',`);

  cy.get('button').contains('Curl').click();
  cy.getByTestId('trigger-curl-snippet').contains(`"sendAt": "<REPLACE_WITH_DATA>",`);
});
