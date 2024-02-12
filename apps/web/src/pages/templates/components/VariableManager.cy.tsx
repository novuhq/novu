import { ReactNode, useLayoutEffect } from 'react';
import { mount } from 'cypress/react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Route, Routes } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { TestWrapper } from '../../../testing';
import { VariableManager } from './VariableManager';
import { TemplateEditorFormProvider } from './TemplateEditorFormProvider';
import { useVariablesManager } from '../../../hooks';

it('should show available variables - string', function () {
  mount(
    <ParentWrapper content={'Hello, {{ name }}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - array', function () {
  mount(
    <ParentWrapper content={'Hello, {{#each name}} {{/each}}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
});

it('should show available variables including nested - array', function () {
  mount(
    <ParentWrapper content={'Hello, {{#each name}} {{nested_variable}} {{/each}}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 2);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('array');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables - boolean', function () {
  mount(
    <ParentWrapper content={'Hello, {{#if name}} {{/if}}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
});

it('should show available variables including nested - boolean', function () {
  mount(
    <ParentWrapper content={'Hello, {{#if name}} {{nested_variable}} {{/if}}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 2);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show available variables including deeply nested', function () {
  mount(
    <ParentWrapper
      content={
        'Hello, {{#if name}} {{nested_variable}} {{#each nested_name}} {{deeply_nested_variable}} {{/each}} {{/if}}'
      }
    >
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 4);
  cy.getByTestId('template-variable-row').contains('name');
  cy.getByTestId('template-variable-row').contains('boolean');
  cy.getByTestId('template-variable-row').contains('nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
  cy.getByTestId('template-variable-row').contains('nested_name');
  cy.getByTestId('template-variable-row').contains('array');
  cy.getByTestId('template-variable-row').contains('deeply_nested_variable');
  cy.getByTestId('template-variable-row').contains('value');
});

it('should show reserved variables', function () {
  mount(
    <ParentWrapper content={'Hello, {{ subscriber }}'}>
      <VariableManagerTester />
    </ParentWrapper>
  );

  cy.getByTestId('template-variable-row').should('have.length', 1);
  cy.getByTestId('template-variable-row').contains('This variable is reserved by the system');
});

function FormTester({ content }: { content: string }) {
  const { control } = useFormContext();
  const steps = useFieldArray({
    control,
    name: 'steps',
  });

  useLayoutEffect(() => {
    steps.append({
      uuid: '123',
      template: {
        type: StepTypeEnum.EMAIL,
        subject: '',
        content,
        contentType: 'editor',
        variables: [],
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}

const templateFields = ['content'];

function ParentWrapper({ content, children }: { content: string; children: ReactNode }) {
  return (
    <TestWrapper initialEntries={[{ pathname: '/workflows/edit/asd/email/123' }]}>
      <Routes>
        <Route
          path="/workflows/edit/:workflowId/:channel/:stepUuid"
          element={
            <TemplateEditorFormProvider>
              {children}
              <FormTester content={content} />
            </TemplateEditorFormProvider>
          }
        />
      </Routes>
    </TestWrapper>
  );
}

function VariableManagerTester() {
  const variablesArray = useVariablesManager(templateFields);

  return <VariableManager variablesArray={variablesArray} path="steps.0.template" />;
}
